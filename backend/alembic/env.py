from logging.config import fileConfig

from alembic import context

from app import models  # noqa: F401  (tabloları metadata'ya kaydeder)
from app.database import Base, engine

if context.config.config_file_name:
    fileConfig(context.config.config_file_name)


def run_migrations_online() -> None:
    with engine.connect() as connection:
        # render_as_batch: SQLite'ta ALTER TABLE kısıtlarını aşmak için
        context.configure(connection=connection, target_metadata=Base.metadata, render_as_batch=True)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
