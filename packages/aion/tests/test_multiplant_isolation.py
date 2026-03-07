"""
tests/test_multiplant_isolation.py
CONCRYA AION — Teste de isolamento multi-planta

Verifica que calibrações, alertas e snapshots de PLANTA-01 nunca
contaminam os de PLANTA-02, mesmo quando executados na mesma sessão.

Executar:
    python -m pytest tests/test_multiplant_isolation.py -v

Não requer servidor rodando — chama a camada de serviço diretamente.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

# ── bootstrap: garante que a raiz do projeto está no path ────────────────────
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.database import Base
from app.models import Plant, Batch, StrengthResult, Alert
import app.models  # registra todos os models no Base.metadata
import infrastructure.repositories.parameter_repo  # registra ParameterSnapshot

from app.services.calibration_service import CalibrationService
from app.services.alert_engine import check_and_create_alerts
from app.services.prediction_engine import predict
from infrastructure.repositories.parameter_repo import ParameterRepository, ParameterSnapshot


# ─────────────────────────────────────────────────────────────────────────────
#  FIXTURE: banco isolado em memória
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture()
def db() -> Session:
    """SQLite em memória com todas as tabelas criadas."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    Session_ = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = Session_()
    yield session
    session.close()
    engine.dispose()


# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _create_plant(db: Session, plant_id: str, name: str) -> Plant:
    p = Plant(id=plant_id, name=name, is_active=True)
    db.add(p)
    db.flush()
    return p


def _create_batch(
    db: Session,
    plant_id: str,
    ext: str,
    fck: float = 35.0,
    temp: float = 23.0,
    day_offset: int = 0,
) -> Batch:
    b = Batch(
        plant_id=plant_id,
        external_id=ext,
        occurred_at=datetime(2026, 1, 6) + timedelta(days=day_offset),
        target_fck=fck,
        temperature=temp,
    )
    db.add(b)
    db.flush()
    return b


def _post_result(
    db: Session,
    batch: Batch,
    age: float,
    fc_mpa: float,
    model: str = "arrhenius",
) -> tuple[StrengthResult, object]:
    """Persiste resultado e roda calibração + alertas. Retorna (result, outcome)."""
    repo = ParameterRepository(db)
    current = repo.get_current(plant_id=batch.plant_id, model=model)
    fc_pred = predict(temp_c=batch.temperature, age=age, fc_inf=current.fc_inf, k=current.k)
    residual = fc_mpa - fc_pred

    result = StrengthResult(
        plant_id=batch.plant_id,
        batch_id=batch.id,
        age_days=age,
        fc_mpa=fc_mpa,
    )
    db.add(result)
    db.flush()

    # Carrega records APENAS da planta do lote
    rows = (
        db.query(StrengthResult, Batch)
        .join(Batch, StrengthResult.batch_id == Batch.id)
        .filter(Batch.plant_id == batch.plant_id)
        .all()
    )
    records = [
        {"external_id": b.external_id, "age_days": r.age_days,
         "fc_mpa": r.fc_mpa, "temperature": b.temperature}
        for r, b in rows
    ]

    svc = CalibrationService(db)
    outcome = svc.run_after_result(
        result_id=result.id,
        plant_id=batch.plant_id,
        new_residual=residual,
        records=records,
        model=model,
    )
    check_and_create_alerts(
        db=db, result=result, batch=batch,
        plant_id=batch.plant_id,
        fc_predicted=fc_pred,
        sigma=outcome.sigma, sigma_n=outcome.sigma_n,
    )
    db.commit()
    return result, outcome


# Pares (fc_7, fc_28) por lote — calibração precisa de ambos no mesmo batch
# P1: fc28 ~ 44 MPa, temp 23 °C
_P1_PAIRS = [
    (30.0, 44.0),
    (31.0, 45.0),
    (30.5, 43.5),
    (31.5, 44.5),
    (30.0, 43.0),
]
# P2: fc28 ~ 52 MPa, temp 18 °C — distribuição claramente diferente
_P2_PAIRS = [
    (35.0, 52.0),
    (36.0, 53.0),
    (34.5, 51.5),
    (35.5, 52.5),
    (34.0, 51.0),
]


# ─────────────────────────────────────────────────────────────────────────────
#  TESTES
# ─────────────────────────────────────────────────────────────────────────────

class TestIsolamento:
    """Garante que dados de P1 nunca aparecem no escopo de P2 e vice-versa."""

    def _setup_two_plants(self, db: Session):
        """Cria 2 plantas, 5 lotes cada, com fc_7 + fc_28 no mesmo lote."""
        _create_plant(db, "PLANTA-01", "Matriz SP")
        _create_plant(db, "PLANTA-02", "Filial RJ")

        # PLANTA-01 — 5 lotes, cada um com resultado 7d e 28d
        for i, (fc7, fc28) in enumerate(_P1_PAIRS):
            b = _create_batch(db, "PLANTA-01", f"L{i:03}", fck=35.0, temp=23.0, day_offset=i)
            _post_result(db, b, 7.0, fc7)
            _post_result(db, b, 28.0, fc28)

        # PLANTA-02 — 5 lotes, cada um com resultado 7d e 28d
        for i, (fc7, fc28) in enumerate(_P2_PAIRS):
            b = _create_batch(db, "PLANTA-02", f"R{i:03}", fck=40.0, temp=18.0, day_offset=i)
            _post_result(db, b, 7.0, fc7)
            _post_result(db, b, 28.0, fc28)

    def test_snapshots_per_plant_isolados(self, db: Session):
        """Cada planta acumula seus próprios snapshots, sem contaminação."""
        self._setup_two_plants(db)

        snaps_p1 = db.query(ParameterSnapshot).filter(
            ParameterSnapshot.plant_id == "PLANTA-01"
        ).count()
        snaps_p2 = db.query(ParameterSnapshot).filter(
            ParameterSnapshot.plant_id == "PLANTA-02"
        ).count()

        assert snaps_p1 > 0, "PLANTA-01 deveria ter snapshots"
        assert snaps_p2 > 0, "PLANTA-02 deveria ter snapshots"

        # Nenhum snapshot deve ter plant_id NULL
        null_snaps = db.query(ParameterSnapshot).filter(
            ParameterSnapshot.plant_id.is_(None)
        ).count()
        assert null_snaps == 0, f"{null_snaps} snapshots sem plant_id"

    def test_parametros_diferentes_por_planta(self, db: Session):
        """fc_inf e k calibrados divergem porque os dados são diferentes."""
        self._setup_two_plants(db)

        repo = ParameterRepository(db)
        p1 = repo.get_current(plant_id="PLANTA-01")
        p2 = repo.get_current(plant_id="PLANTA-02")

        assert not p1.is_default, "PLANTA-01 deveria ter parâmetros calibrados"
        assert not p2.is_default, "PLANTA-02 deveria ter parâmetros calibrados"
        # fc_inf de P2 (fc28~52) deve ser maior que P1 (fc28~44)
        assert p2.fc_inf > p1.fc_inf, (
            f"fc_inf P2={p2.fc_inf:.2f} deveria ser > P1={p1.fc_inf:.2f}"
        )

    def test_get_current_isolado_por_planta(self, db: Session):
        """get_current de P1 nunca retorna snapshot de P2."""
        self._setup_two_plants(db)
        repo = ParameterRepository(db)

        p1 = repo.get_current(plant_id="PLANTA-01")
        p2 = repo.get_current(plant_id="PLANTA-02")

        assert p1.snapshot_id != p2.snapshot_id, (
            "snapshot_id de P1 e P2 não podem ser iguais"
        )

    def test_resultados_plant_id_preenchido(self, db: Session):
        """Todo StrengthResult gravado tem plant_id não-nulo."""
        self._setup_two_plants(db)

        null_results = db.query(StrengthResult).filter(
            StrengthResult.plant_id.is_(None)
        ).count()
        assert null_results == 0, f"{null_results} resultados sem plant_id"

        count_p1 = db.query(StrengthResult).filter(
            StrengthResult.plant_id == "PLANTA-01"
        ).count()
        count_p2 = db.query(StrengthResult).filter(
            StrengthResult.plant_id == "PLANTA-02"
        ).count()
        assert count_p1 == len(_P1_PAIRS) * 2  # fc_7 + fc_28 por lote
        assert count_p2 == len(_P2_PAIRS) * 2

    def test_alertas_plant_id_preenchido(self, db: Session):
        """Todos os alertas gerados têm plant_id correto."""
        self._setup_two_plants(db)

        null_alerts = db.query(Alert).filter(Alert.plant_id.is_(None)).count()
        assert null_alerts == 0, f"{null_alerts} alertas sem plant_id"

        # Alertas de P2 nunca aparecem em P1 e vice-versa
        mixed = (
            db.query(Alert)
            .join(Batch, Alert.batch_id == Batch.id)
            .filter(Alert.plant_id != Batch.plant_id)
            .count()
        )
        assert mixed == 0, f"{mixed} alertas com plant_id divergente do lote"

    def test_sql_bad_links_zero(self, db: Session):
        """
        Verificação SQL: snapshots sempre vinculados a results da mesma planta.
        Equivale a: SELECT COUNT(*) bad_links FROM ... WHERE s.plant_id <> r.plant_id
        """
        self._setup_two_plants(db)

        bad = db.execute(text("""
            SELECT COUNT(*) FROM parameter_snapshots s
            JOIN strength_results r ON r.id = s.triggered_by_result_id
            WHERE s.plant_id != r.plant_id
        """)).scalar()

        assert bad == 0, (
            f"{bad} snapshot(s) com plant_id divergente do result que os disparou"
        )

    def test_planta_inexistente_retorna_defaults(self, db: Session):
        """Planta sem histórico retorna defaults sem crashar."""
        _create_plant(db, "PLANTA-03", "Sem dados")
        repo = ParameterRepository(db)
        params = repo.get_current(plant_id="PLANTA-03")
        assert params.is_default
        assert params.fc_inf == 55.0  # default hardcoded

    def test_calibracao_nao_polui_plant_none(self, db: Session):
        """
        Resultados de plantas identificadas não afetam o escopo plant_id=None.
        (retrocompatibilidade: lotes sem planta associada ficam isolados)
        """
        self._setup_two_plants(db)
        repo = ParameterRepository(db)

        # Scopo None deve retornar defaults (nenhum resultado foi postado sem planta)
        params_none = repo.get_current(plant_id=None)
        assert params_none.is_default, (
            "Escopo plant_id=None não deve ter snapshots de plantas identificadas"
        )
