"""
app/seed.py
Cria todas as tabelas e insere um Batch de teste (L001).
Rode uma vez: python -m app.seed
"""
from datetime import datetime

from app.database import Base, SessionLocal, engine

# Importar todos os models para registrá-los na metadata antes do create_all
import app.models  # noqa: F401
import infrastructure.repositories.parameter_repo  # noqa: F401 (ParameterSnapshot)

from app.models import Batch


def main() -> None:
    # Cria tabelas (idempotente — não apaga dados existentes)
    Base.metadata.create_all(engine)
    print("Tabelas criadas/verificadas.")

    db = SessionLocal()
    try:
        existing = db.query(Batch).filter(Batch.external_id == "L001").first()
        if existing:
            print(f"Batch já existe: id={existing.id} external_id={existing.external_id}")
            return

        b = Batch(
            external_id="L001",
            occurred_at=datetime(2025, 1, 10, 8, 0),
            target_fck=40.0,
            temperature=28.0,
        )
        db.add(b)
        db.commit()
        db.refresh(b)
        print(f"Batch criado: id={b.id} external_id={b.external_id}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
