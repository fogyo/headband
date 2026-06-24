import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sync_engine = create_engine(os.getenv("DB_ADDRESS_SYNC"))
SyncSessionLocal = sessionmaker(bind=sync_engine)
