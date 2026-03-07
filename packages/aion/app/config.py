from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # SQLite default keeps local dev zero-setup; Docker overrides with Postgres.
    database_url: str = "sqlite:///./aion.db"
    default_model: str = "arrhenius"
    default_fc_inf: float = 55.0
    default_k: float = 0.25
    nc_critical_delta_mpa: float = 3.0

    # Thresholds de DRIFT: sigma-based (quando sigma maduro) ou absoluto (fallback)
    sigma_min_n: int = 5               # n mínimo de observações para sigma ser confiável
    alert_warn_mult: float = 1.5       # WARN  = warn_mult × sigma
    alert_crit_mult: float = 2.5       # CRIT  = crit_mult × sigma
    # Fallback absoluto (MPa) quando sigma ainda não é confiável (sigma_n < sigma_min_n)
    drift_threshold_mpa: float = 2.0   # WARN  absoluto
    drift_critical_mpa: float = 4.0    # CRIT  absoluto
    # Piso de sigma — evita alertas histéricos em early-stage
    sigma_floor_mpa: float = 2.5       # sigma nunca cai abaixo disso
    # Piso absoluto para threshold mesmo em modo sigma maduro
    drift_abs_min_sigma_mode: float = 4.0  # max(mult×sigma, este valor)

    class Config:
        env_file = ".env"
        extra = "ignore"    # auth vars (AION_SESSION_SECRET etc.) são lidos via os.getenv()


settings = Settings()
