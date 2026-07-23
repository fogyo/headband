from __future__ import annotations
import logging
import os
import uuid
from doctest import master
from enum import Enum
from typing import List, Optional, AsyncGenerator

from dotenv import load_dotenv
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import ForeignKey, select, update, BigInteger, String, Date, text, delete, and_, func, UniqueConstraint, \
    or_, Boolean, Time, DateTime
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, selectinload
from datetime import time, date, datetime, timedelta
from sqlalchemy import inspect
import os


logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)
load_dotenv()
db_address = os.getenv('DB_ADDRESS')
engine = create_async_engine(db_address)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)



async def setup_database():
    try:
        async with engine.begin() as conn:
            """tables_result = await conn.execute(
                text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
            )
            
            tables = [row[0] for row in tables_result.fetchall()]
             
            await conn.execute(text("SET CONSTRAINTS ALL DEFERRED"))

            for table in tables:
                try:
                    await conn.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))
                    logging.info(f"Таблица {table} удалена")
                except Exception as e:
                    logging.warning(f"Ошибка при удалении таблицы {table}: {e}")"""

            #await conn.run_sync(Base.metadata.create_all)

            tables = await conn.run_sync(lambda sync_conn: inspect(sync_conn).get_table_names())
            logging.info(f"Таблицы в базе данных: {tables}")
            return True
    except Exception as e:
        logging.error(f"Ошибка создания БД: {e}")
        return False


async def close_connection():
    if engine:
        await engine.dispose()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            raise
        finally:
            await session.close()


class Base(DeclarativeBase):
    pass

class SupportStatus(Enum):
    PENDING = 1
    SOLVED = 2

class Week(Enum):
    MONDAY = 1
    TUESDAY = 2
    WEDNESDAY = 3
    THURSDAY = 4
    FRIDAY = 5
    SATURDAY = 6
    SUNDAY = 7

class AppointmentStatus(Enum):
    CONFIRMED = 1
    PENDING = 2
    CANCELLED = 3

class GuideStatus(Enum):
    CONFIRMED = 1
    PENDING = 2
    DENIED = 3


class SubLevel(Enum):
    HEADBAND_BASE = 1
    HEADBAND_PARTNER = 2
    HEADBEAUTY = 3

class AdminModel(Base):
    __tablename__ = "admins"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String, nullable=False)
    creator: Mapped[bool] = mapped_column(Boolean, default=False)

    @classmethod
    async def create(cls, session: AsyncSession, chat_id: int, password: str) -> uuid.UUID:
        """Создаёт нового администратора"""
        admin = cls(chat_id=chat_id, password=password)  # здесь можно захешировать пароль
        session.add(admin)
        await session.flush()
        return admin.id

    @classmethod
    async def get_by_chat_id(cls, session: AsyncSession, chat_id: int) -> Optional["AdminModel"]:
        """Получает администратора по chat_id"""
        query = select(cls).where(cls.chat_id == chat_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_id(cls, session: AsyncSession, admin_id: uuid.UUID) -> Optional["AdminModel"]:
        """Получает администратора по id"""
        query = select(cls).where(cls.id == admin_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def update(cls, session: AsyncSession, admin_id: uuid.UUID, update_data: dict) -> str:
        """Обновляет данные администратора (например, пароль)"""
        query = update(cls).where(cls.id == admin_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, admin_id: uuid.UUID) -> str:
        """Удаляет администратора по id"""
        obj = await session.get(cls, admin_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such admin"

    @classmethod
    async def verify_password(cls, session: AsyncSession, chat_id: int, password: str) -> bool:
        """Проверяет пароль хэш"""
        admin = await cls.get_by_chat_id(session, chat_id)
        if not admin:
            return False
        return admin.password == password

class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id: Mapped[int] = mapped_column(BigInteger)
    username: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[date] = mapped_column(Date, default=date.today)

    # Relationships
    appointments: Mapped[List["AppointmentModel"]] = relationship(
        "AppointmentModel",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    ratings: Mapped[List["RatingModel"]] = relationship(
        "RatingModel",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    constant_masters: Mapped[List["MasterConstantUsersModel"]] = relationship(
        "MasterConstantUsersModel",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    @classmethod
    async def get_progression_users(
            cls,
            session: AsyncSession,
            weeks: int = 5
    ) -> List[dict]:
        """
        Возвращает прогрессию количества пользователей за последние `weeks` недель.
        Каждый элемент словаря: {'date_record': date (начало недели), 'users_amount': int}
        """
        # 1. Генерируем список начал недель за последние weeks недель (включая текущую)
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())  # понедельник текущей недели
        week_starts = [start_of_week - timedelta(weeks=i) for i in range(weeks - 1, -1, -1)]
        week_starts = sorted(week_starts)

        # 2. Запрос к БД: группировка по неделям с date_trunc
        start_date = week_starts[0]  # самая ранняя дата

        query = select(
            func.date_trunc('week', cls.created_at).label('week_start'),
            func.count(cls.id).label('count')
        ).where(
            cls.created_at <= start_date
        ).group_by(
            func.date_trunc('week', cls.created_at)
        ).order_by(
            func.date_trunc('week', cls.created_at)
        )

        result = await session.execute(query)
        rows = result.all()

        # Создаём словарь для быстрого доступа
        stats = {row.week_start.date(): row.count for row in rows}

        # 3. Формируем итоговый список
        progression = []
        for week_start in week_starts:
            count = stats.get(week_start, 0)
            progression.append({
                'amount': count,
                'date_record': week_start
            })

        return progression

    @classmethod
    async def create(cls, session: AsyncSession, data: dict):
        user = cls(**data)
        session.add(user)
        await session.flush()
        return user.id

    @classmethod
    async def get_by_chat_id(cls, session: AsyncSession, chat_id: int):
        query = select(cls).where(cls.chat_id == chat_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_id(cls, session: AsyncSession, user_id: uuid.UUID):
        query = select(cls).where(cls.id == user_id)
        result = await session.execute(query)
        return result.scalars().first()


class CategoryModel(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String)
    parental_name: Mapped[str] = mapped_column(String)
    eng_name: Mapped[str] = mapped_column(String)

    # Relationships
    master_categories: Mapped[List["MasterCategoryModel"]] = relationship(
        "MasterCategoryModel",
        back_populates="category",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    prices: Mapped[List["PriceModel"]] = relationship(
        "PriceModel",
        back_populates="category",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    @classmethod
    async def delete(cls, session: AsyncSession, category_id: uuid.UUID) -> str:
        obj = await session.get(cls, category_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "cat not found"

    @classmethod
    async def get_all(cls, session: AsyncSession):
        query = select(cls)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    def get_all_sync(cls, session):
        query = select(cls)
        result = session.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_by_id_name(cls, session: AsyncSession, category_id: uuid.UUID):
        query = select(cls.name).where(cls.id == category_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_id_parental_name(cls, session: AsyncSession, category_id: uuid.UUID):
        query = select(cls.parental_name).where(cls.id == category_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_id_eng_name(cls, session: AsyncSession, category_id: uuid.UUID):
        query = select(cls.eng_name).where(cls.id == category_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_parental(cls, session: AsyncSession, parental_name: str):
        query = select(cls.id).where(cls.parental_name == parental_name)
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def create(cls, session: AsyncSession, data: dict):
        category = cls(**data)
        session.add(category)
        await session.flush()
        return "success"

    @classmethod
    async def get_by_name(cls, session: AsyncSession, name: str):
        query = select(cls).where(cls.name == name)
        result = await session.execute(query)
        return result.scalars().first()


class MasterModel(Base):
    __tablename__ = "masters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id_tg: Mapped[int] = mapped_column(BigInteger, nullable=True)
    username_tg: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    avatar: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    master_link_id: Mapped[uuid.UUID]
    user_link_id: Mapped[uuid.UUID]
    referrer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)  # Кто пригласил
    referral_counted: Mapped[bool] = mapped_column(default=False) # Засчитан ли реферал
    created_at: Mapped[date] = mapped_column(Date, default=date.today, nullable=True)

    # Relationships
    appointments: Mapped[List["AppointmentModel"]] = relationship(
        "AppointmentModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    working_days: Mapped[List["WorkingDayModel"]] = relationship(
        "WorkingDayModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    week_templates: Mapped[List["WeekTemplateModel"]] = relationship(
        "WeekTemplateModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    master_absences: Mapped[List["MasterAbsenceModel"]] = relationship(
        "MasterAbsenceModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    master_categories: Mapped[List["MasterCategoryModel"]] = relationship(
        "MasterCategoryModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    prices: Mapped[List["PriceModel"]] = relationship(
        "PriceModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    addresses: Mapped[List["AddressModel"]] = relationship(
        "AddressModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    earnings: Mapped[List["EarningsModel"]] = relationship(
        "EarningsModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    prepayments: Mapped[List["PrepayModel"]] = relationship(
        "PrepayModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    notifications: Mapped["MasterNotificationModel"] = relationship(
        "MasterNotificationModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False
    )
    subscription: Mapped["SubscriptionModel"] = relationship(
        "SubscriptionModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False
    )
    referral_stats: Mapped["MasterReferralModel"] = relationship(
        "MasterReferralModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False
    )
    guide_stats: Mapped[List["GuideStatModel"]] = relationship(
        "GuideStatModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    cards: Mapped[List["CardModel"]] = relationship(
        "CardModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    work_files: Mapped[List["WorkFilesModel"]] = relationship(
        "WorkFilesModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    ratings: Mapped[List["RatingModel"]] = relationship(
        "RatingModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    constant_users: Mapped[List["MasterConstantUsersModel"]] = relationship(
        "MasterConstantUsersModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    subscription_bank: Mapped["SubscriptionBankModel"] = relationship(
        "SubscriptionBankModel",
        back_populates="master",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False
    )

    @classmethod
    async def get_progression_masters(
            cls,
            session: AsyncSession,
            weeks: int = 5
    ) -> List[dict]:
        """
        Возвращает прогрессию количества мастеров за последние `weeks` недель.
        Каждый элемент словаря: {'date_record': date (начало недели), 'masters_amount': int}
        """

        today = date.today()

        start_of_week = today - timedelta(days=today.weekday())  # weekday() 0=понедельник
        week_starts = [start_of_week - timedelta(weeks=i) for i in range(weeks - 1, -1, -1)]

        week_starts = sorted(week_starts)

        start_date = week_starts[0]

        query = select(
            func.date_trunc('week', cls.created_at).label('week_start'),
            func.count(cls.id).label('count')
        ).where(
            cls.created_at <= start_date
        ).group_by(
            func.date_trunc('week', cls.created_at)
        ).order_by(
            func.date_trunc('week', cls.created_at)
        )

        result = await session.execute(query)
        rows = result.all()  # list of Row

        stats = {row.week_start.date(): row.count for row in rows}

        progression = []
        for week_start in week_starts:
            count = stats.get(week_start, 0)
            progression.append({
                'amount': count,
                'date_record': week_start
            })

        return progression

    @classmethod
    async def create(cls, session: AsyncSession, data: dict):
        master = cls(**data)
        session.add(master)
        await session.flush()
        return master.id

    @classmethod
    async def get_by_id(cls, session: AsyncSession, master_id: uuid.UUID):
        query = select(cls).where(cls.id == master_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_link_id(cls, session: AsyncSession, ref: uuid.UUID):
        query = select(cls).where(or_(cls.user_link_id == ref, cls.master_link_id==ref))
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_partners(cls, session: AsyncSession):
        query = (
            select(cls)
            .join(cls.subscription)  # предполагается, что отношение определено
            .where(
                and_(
                    SubscriptionModel.level == 2,
                    SubscriptionModel.end_date >= date.today()
                )
            )
        )
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    def get_expiring(cls, session):
        query = (
            select(cls)
            .join(cls.subscription)  # предполагается, что отношение определено
            .where(or_((SubscriptionModel.end_date+timedelta(days=1)) == date.today(), SubscriptionModel.end_date==date.today())
            ).options(selectinload(MasterModel.subscription_bank), selectinload(MasterModel.notifications), selectinload(MasterModel.subscription))
        )
        result = session.execute(query)
        return list(result.scalars().all())

    @classmethod
    def get_masters_to_confirm(cls, session):
        query = (
            select(cls)
            .join(cls.appointments)  # предполагается, что отношение определено
            .where(and_(AppointmentModel.date <= date.today(),
                       AppointmentModel.status == AppointmentStatus.PENDING.value
                   ).options(selectinload(MasterModel.notifications), selectinload(MasterModel.appointments))
        ))
        result = session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def get_by_chat_id_tg(cls, session: AsyncSession, chat_id: int):
        query = select(cls).where(cls.chat_id_tg == chat_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_categories(cls, session: AsyncSession, master_id: uuid.UUID):
        query = select(CategoryModel).join(MasterCategoryModel).where(MasterCategoryModel.master_id == master_id)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def update(cls, session: AsyncSession, master_id: uuid.UUID, update_data: dict):
        query = update(cls).where(cls.id == master_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def mark_referral_counted(cls, session: AsyncSession, master_id: uuid.UUID) -> str:
        """Отметить, что реферал засчитан"""
        query = update(cls).where(cls.id == master_id).values(referral_counted=True)
        await session.execute(query)
        return "success"

    @classmethod
    async def get_referrer_id(cls, session: AsyncSession, master_id: uuid.UUID) -> Optional[uuid.UUID]:
        """Получить ID реферера мастера"""
        master = await session.get(cls, master_id)
        return master.referrer_id if master else None

class MasterCategoryModel(Base):
    __tablename__ = "master_categories"

    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"), primary_key=True)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True)

    # Relationships
    master: Mapped["MasterModel"] = relationship("MasterModel", back_populates="master_categories")
    category: Mapped["CategoryModel"] = relationship("CategoryModel", back_populates="master_categories")

    @classmethod
    async def get_categories_by_master(cls, id: uuid.UUID, session: AsyncSession):
        query = select(cls).where(cls.master_id == id)
        result = await session.execute(query)
        categories = result.scalars().all()
        category_ids = [cat.category_id for cat in categories]
        return category_ids

    @classmethod
    async def add_category_to_master(cls, master_id: uuid.UUID, category_id: uuid.UUID,
                                     session: AsyncSession):
        """Создаёт связь между мастером и категорией."""
        # Проверяем, не существует ли уже такая связь
        stmt = select(cls).where(and_(cls.master_id == master_id, cls.category_id == category_id))
        existing = await session.execute(stmt)
        if existing.scalar_one_or_none():
            return "Relation already exists"

        new_relation = cls(master_id=master_id, category_id=category_id)
        session.add(new_relation)
        await session.flush()  # чтобы получить объект с возможными авто-значениями, но не коммитить
        return "success"

    @classmethod
    async def remove_category_from_master(cls, master_id: uuid.UUID, category_id: uuid.UUID,
                                          session: AsyncSession) -> None:
        """Удаляет связь между мастером и категорией."""
        stmt = delete(cls).where(cls.master_id == master_id, cls.category_id == category_id)
        result = await session.execute(stmt)
        if result.rowcount == 0:
            raise ValueError("Relation not found")





class WorkingDayModel(Base):
    __tablename__ = "working_days"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"))
    day_date: Mapped[date] = mapped_column(Date)
    start_time: Mapped[time]
    end_time: Mapped[time]
    address_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("addresses.id", ondelete="CASCADE"))

    # Relationships
    master: Mapped["MasterModel"] = relationship("MasterModel", back_populates="working_days")
    address: Mapped["AddressModel"] = relationship("AddressModel", back_populates="working_days")
    appointments: Mapped[List["AppointmentModel"]] = relationship(
        "AppointmentModel",
        back_populates="working_day",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    @classmethod
    async def create(cls, session: AsyncSession, data: dict, master_id: uuid.UUID):
        data["master_id"] = master_id
        working_day = cls(**data)
        session.add(working_day)
        await session.flush()
        return working_day.id

    @classmethod
    async def get_by_master_and_date(cls, session: AsyncSession, master_id: uuid.UUID, day_date: date):
        query = select(cls).where(cls.master_id == master_id, cls.day_date == day_date)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID):
        query = select(cls).where(cls.master_id == master_id)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_by_id(cls, session: AsyncSession, id: uuid.UUID):
        query = select(cls).where(cls.id == id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_id_and_dates(cls, id: uuid.UUID, sd: date, ed: date, session: AsyncSession):
        query = select(WorkingDayModel).where(
            WorkingDayModel.master_id == id,
            WorkingDayModel.day_date >= sd,
            WorkingDayModel.day_date <= ed
        )
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def update(cls, session: AsyncSession, wd_id: uuid.UUID, update_data: dict):
        query = update(cls).where(cls.id == wd_id).values(**update_data)
        await session.execute(query)
        return "success"


class WeekTemplateModel(Base):
    __tablename__ = "week_template"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"))
    weekday: Mapped[int]
    start_time: Mapped[time]
    end_time: Mapped[time]
    address_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("addresses.id", ondelete="CASCADE"))

    # Relationships
    master: Mapped["MasterModel"] = relationship("MasterModel", back_populates="week_templates")
    address: Mapped["AddressModel"] = relationship("AddressModel", back_populates="week_templates")

    @classmethod
    async def create(cls, session: AsyncSession, data: dict):
        template = cls(**data)
        session.add(template)
        await session.flush()
        return template.id

    @classmethod
    async def get_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID):
        query = select(cls).where(cls.master_id == master_id)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_by_master_and_weekday(cls, session: AsyncSession, master_id: uuid.UUID, weekday: int):
        query = select(cls).where(cls.master_id == master_id, cls.weekday == weekday)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def delete_by_master_id_weekday(cls, session: AsyncSession, master_id: uuid.UUID, weekday: int) -> str:
        query = delete(cls).where(and_(cls.master_id == master_id, cls.weekday == weekday))
        await session.execute(query)
        return "success"

    @classmethod
    async def update(cls, session: AsyncSession, template_id: uuid.UUID, update_data: dict) -> str:
        query = update(cls).where(cls.id == template_id).values(**update_data)
        await session.execute(query)
        return "success"

class MasterAbsenceModel(Base):
    __tablename__ = "master_absences"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"))
    start_date: Mapped[date]
    end_date: Mapped[date]
    reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    master: Mapped["MasterModel"] = relationship("MasterModel", back_populates="master_absences")

    @classmethod
    async def create(cls, session: AsyncSession, data: dict):
        absence = cls(**data)
        session.add(absence)
        await session.flush()
        return absence.id

    @classmethod
    async def get_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID):
        query = select(cls).where(cls.master_id == master_id)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def delete(cls, session: AsyncSession, absence_id: uuid.UUID) -> str:
        obj = await session.get(cls, absence_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "absence not found"

    @classmethod
    async def is_absent(cls, session: AsyncSession, master_id: uuid.UUID, check_date: date):
        query = select(cls).where(
            cls.master_id == master_id,
            cls.start_date <= check_date,
            cls.end_date >= check_date
        )
        result = await session.execute(query)
        return result.scalars().first() is not None

    @classmethod
    async def update(cls, session: AsyncSession, id: uuid.UUID, update_data: dict) -> str:
        query = update(cls).where(cls.id == id).values(**update_data)
        await session.execute(query)
        return "success"

class AddressModel(Base):
    __tablename__ = "addresses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"))
    address: Mapped[str]

    # Relationships
    master: Mapped["MasterModel"] = relationship("MasterModel", back_populates="addresses")
    working_days: Mapped[List["WorkingDayModel"]] = relationship(
        "WorkingDayModel",
        back_populates="address",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    week_templates: Mapped[List["WeekTemplateModel"]] = relationship(
        "WeekTemplateModel",
        back_populates="address",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    @classmethod
    async def create(cls, session: AsyncSession, data: dict):
        address = cls(**data)
        session.add(address)
        await session.flush()
        return address.id

    @classmethod
    async def get_by_id(cls, session: AsyncSession, address_id: uuid.UUID):
        query = select(cls).where(cls.id == address_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID):
        query = select(cls).where(cls.master_id == master_id)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def delete(cls, session: AsyncSession, address_id: uuid.UUID):
        obj = await session.get(cls, address_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such address"

    @classmethod
    async def update(cls, session: AsyncSession, address_id: uuid.UUID, update_data: dict) -> str:
        query = update(cls).where(cls.id == address_id).values(**update_data)
        await session.execute(query)
        return "success"


class PriceModel(Base):
    __tablename__ = "prices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String)
    price: Mapped[int] = mapped_column(BigInteger)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"))
    approximate_time: Mapped[int]
    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"))

    # Relationships
    category: Mapped["CategoryModel"] = relationship("CategoryModel", back_populates="prices")
    master: Mapped["MasterModel"] = relationship("MasterModel", back_populates="prices")
    appointments: Mapped[List["AppointmentModel"]] = relationship(
        "AppointmentModel",
        back_populates="price",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    @classmethod
    async def create(cls, session: AsyncSession, data: dict):
        price = cls(**data)
        session.add(price)
        await session.flush()
        return price.id

    @classmethod
    def create_sync(cls, session, data: dict):
        price = cls(**data)
        session.add(price)
        session.flush()
        return price.id

    @classmethod
    async def get_by_id(cls, session: AsyncSession, price_id: uuid.UUID):
        query = select(cls).where(cls.id == price_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID) -> List['PriceModel']:
        query = select(cls).where(cls.master_id == master_id)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_cats_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID):
        query = select(cls.category_id).where(cls.master_id == master_id)
        result = await session.execute(query)
        return set(result.scalars().all())

    @classmethod
    async def get_by_category(cls, session: AsyncSession, master_id: uuid.UUID, category_id: uuid.UUID):
        query = select(cls).where(cls.master_id == master_id, cls.category_id == category_id)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def update(cls, session: AsyncSession, price_id: uuid.UUID, update_data: dict):
        query = update(cls).where(cls.id == price_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, price_id: uuid.UUID):
        obj = await session.get(cls, price_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such price"

    @classmethod
    async def get_by_name(cls, session: AsyncSession, master_id: uuid.UUID, name: str):
        """Получение позиции по названию"""
        query = select(cls).where(cls.master_id == master_id, cls.name == name)
        result = await session.execute(query)
        return result.scalars().first()


class AppointmentModel(Base):
    __tablename__ = "appointments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"))
    date: Mapped[date]
    start_time: Mapped[time]
    end_time: Mapped[time]
    final_price: Mapped[int]
    price_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("prices.id", ondelete="CASCADE"))
    working_day_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("working_days.id", ondelete="CASCADE"))
    status: Mapped[int]

    # Relationships
    user: Mapped["UserModel"] = relationship("UserModel", back_populates="appointments")
    master: Mapped["MasterModel"] = relationship("MasterModel", back_populates="appointments")
    price: Mapped["PriceModel"] = relationship("PriceModel", back_populates="appointments")
    working_day: Mapped["WorkingDayModel"] = relationship("WorkingDayModel", back_populates="appointments")

    @classmethod
    async def create(cls, session: AsyncSession, data: dict):
        data["status"] = AppointmentStatus.PENDING.value
        appointment = cls(**data)
        session.add(appointment)
        await session.flush()
        return "success"

    @classmethod
    async def get_by_master_and_date(cls, session: AsyncSession, master_id: uuid.UUID, app_date: date) -> List[AppointmentModel]:
        query = select(cls).where(cls.master_id == master_id, cls.date == app_date).order_by(cls.start_time)
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def get_all(cls, session: AsyncSession) -> int:
        query = select(cls)
        result = await session.execute(query)
        return len(result.scalars().all())

    @classmethod
    async def get_all_future(cls, session: AsyncSession) -> int:
        query = select(cls).where(cls.date>date.today())
        result = await session.execute(query)
        return len(result.scalars().all())

    @classmethod
    async def get_all_confirmed(cls, session: AsyncSession) -> int:
        query = select(cls).where(cls.status == AppointmentStatus.CONFIRMED.value)
        result = await session.execute(query)
        return len(result.scalars().all())

    @classmethod
    async def get_by_master_confirmation(cls, session: AsyncSession, master_id: uuid.UUID, day: date):
        query = select(cls).where(and_(cls.master_id == master_id, cls.status == AppointmentStatus.PENDING.value, day>cls.date)).order_by(cls.start_time)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_by_user_id(cls, session: AsyncSession, user_id: uuid.UUID):
        query = select(cls).where(and_(cls.user_id == user_id,or_(cls.end_time>datetime.now().time(), cls.date>date.today()))).order_by(cls.date, cls.start_time)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_by_id(cls, session: AsyncSession, appointment_id: uuid.UUID):
        query = select(cls).where(cls.id == appointment_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def delete(cls, session: AsyncSession, appointment_id: uuid.UUID):
        obj = await session.get(cls, appointment_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such appointment"

    @classmethod
    async def get_by_date_range(cls, session: AsyncSession, master_id: uuid.UUID, start_date: date, end_date: date) -> List["AppointmentModel"]:
        query = select(cls).where(and_(cls.master_id == master_id, cls.date >= start_date, cls.date <= end_date))
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def confirm(cls, session: AsyncSession, id: uuid.UUID):
        query = update(cls).where(cls.id ==id).values(status=AppointmentStatus.CONFIRMED.value)
        await session.execute(query)
        return "success"

    @classmethod
    async def cancel(cls, session: AsyncSession, id: uuid.UUID):
        query = update(cls).where(cls.id == id).values(status=AppointmentStatus.CANCELLED.value)
        await session.execute(query)
        return "success"

class GuidesModel(Base):
    __tablename__ = "guides"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str]
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="RESTRICT")  # гайд не должен удаляться при удалении категории
    )
    author: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    guide_status: Mapped[int]
    guide_created: Mapped[date]
    guide_last_change: Mapped[date]
    guide_approved: Mapped[date] = mapped_column(Date, nullable=True)

    # Relationships
    category: Mapped["CategoryModel"] = relationship(
        "CategoryModel",
        lazy="joined"
    )
    steps_list: Mapped[List["GuideTextStepModel"]] = relationship(
        "GuideTextStepModel",
        back_populates="guide",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    video_steps_list: Mapped[List["GuideVideoStepModel"]] = relationship(
        "GuideVideoStepModel",
        back_populates="guide",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    guide_stats: Mapped[List["GuideStatModel"]] = relationship(
        "GuideStatModel",
        back_populates="guide",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    @classmethod
    async def get_all(cls, session: AsyncSession):
        query = select(cls).where(cls.guide_status == GuideStatus.CONFIRMED.value)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_by_categories(cls, categories: List[uuid.UUID], session: AsyncSession) -> List[GuidesModel]:
        query = select(cls).where(
            cls.category_id.in_(categories),
            cls.guide_status == GuideStatus.CONFIRMED.value
        )
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def preupload_by_master(cls, master_id: uuid.UUID, session: AsyncSession):
        stmt_master_guides = (
            select(cls)
            .where(cls.author == master_id)
            .options(
                selectinload(cls.guide_stats),
                selectinload(cls.video_steps_list)
            )
        )
        result = await session.execute(stmt_master_guides)
        return result.scalars().all()

    @classmethod
    async def get_by_author(cls, author_id: uuid.UUID, session: AsyncSession)->List["GuidesModel"]:
        query = select(cls).where(cls.author == author_id)
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def get_by_id(cls, guide_id: uuid.UUID, session: AsyncSession):
        query = select(cls).where(cls.id == guide_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def create(cls, session: AsyncSession, data: dict):
        data["guide_status"] = GuideStatus.PENDING.value
        guide = cls(**data)
        session.add(guide)
        await session.flush()
        return guide.id

    @classmethod
    async def update(cls, session: AsyncSession, id: uuid.UUID, update_data: dict):
        update_data["guide_status"] = GuideStatus.PENDING.value
        query = update(cls).where(cls.id ==id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def get_pending_guides(cls, session: AsyncSession):
        stmt_pending = (
            select(cls)
            .where(cls.guide_status == GuideStatus.PENDING.value)
            .options(selectinload(cls.video_steps_list))
        )
        result = await session.execute(stmt_pending)
        return result.scalars().all()

    @classmethod
    async def change_status(cls, session: AsyncSession, guide_id: uuid.UUID, state: int):
        update_data = {}
        if state == 0:
            update_data["guide_status"] = GuideStatus.DENIED.value
        else:
            update_data["guide_status"] = GuideStatus.CONFIRMED.value
            update_data["guide_approved"] = date.today()
        query = update(cls).where(cls.id == guide_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, guide_id: uuid.UUID):
        obj = await session.get(cls, guide_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such guide"

class GuideTextStepModel(Base):
    __tablename__ = "guide_text_steps"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    guide_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("guides.id", ondelete="CASCADE"))
    name: Mapped[str]
    step_num: Mapped[int]
    text: Mapped[str]
    image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    guide: Mapped["GuidesModel"] = relationship("GuidesModel", back_populates="steps_list")

    @classmethod
    async def create(cls, session: AsyncSession, data: List[dict]):
        for step in data:
            s = cls(**step)
            session.add(s)
        await session.flush()
        return "success"

    @classmethod
    async def get_by_step_id(cls, session: AsyncSession, step_id: uuid.UUID):
        query = select(cls).where(cls.id == step_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_guide_id(cls, session: AsyncSession, guide_id: uuid.UUID):
        query = select(cls).where(cls.guide_id == guide_id).order_by(cls.step_num)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_by_num_id(cls, session: AsyncSession, step_num: int, guide_id: uuid.UUID):
        query = select(cls).where(and_(cls.guide_id == guide_id, cls.step_num==step_num))
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def update(cls, session: AsyncSession, step_id: uuid.UUID, update_data: dict):
        query = update(cls).where(cls.id == step_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, step_id: uuid.UUID):
        obj = await session.get(cls, step_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "step not found"


class GuideVideoStepModel(Base):
    __tablename__ = "guide_video_steps"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    guide_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("guides.id", ondelete="CASCADE"))
    step_num: Mapped[int]
    video_name: Mapped[str]
    video_file_path: Mapped[str] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(String, nullable=True)
    preview: Mapped[str] = mapped_column(String, nullable=True)

    guide: Mapped["GuidesModel"] = relationship("GuidesModel", back_populates="video_steps_list")

    @classmethod
    async def create(cls, session: AsyncSession, data: dict):
        step = cls(**data)
        session.add(step)
        await session.flush()
        return step.id

    @classmethod
    async def get_by_guide_id(cls, session: AsyncSession, guide_id: uuid.UUID):
        query = select(cls).where(cls.guide_id == guide_id).order_by(cls.step_num)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_num_id(cls, session: AsyncSession, step_num: int, guide_id: uuid.UUID):
        query = select(cls).where(and_(cls.guide_id == guide_id, cls.step_num == step_num))
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def update(cls, session: AsyncSession, step_id: uuid.UUID, update_data: dict):
        query = update(cls).where(cls.id == step_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, step_id: uuid.UUID):
        obj = await session.get(cls, step_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "video step not found"


class GuideStatModel(Base):
    __tablename__ = "guide_stats"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    guide_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("guides.id", ondelete="CASCADE"))
    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"))
    action: Mapped[int] = mapped_column(default=0)  # 0: просмотр, 1: просмотр с лайком

    guide: Mapped["GuidesModel"] = relationship("GuidesModel",
                                                back_populates="guide_stats")
    master: Mapped["MasterModel"] = relationship("MasterModel",
                                                 back_populates="guide_stats")

    __table_args__ = (UniqueConstraint("guide_id", "master_id", name="uq_guide_master"),)

    @classmethod
    async def create(cls, session: AsyncSession, data: dict) -> uuid.UUID:
        """Создание записи статистики"""
        stat = cls(**data)
        session.add(stat)
        await session.flush()
        return stat.id


    @classmethod
    async def get_by_id(cls, session: AsyncSession, stat_id: uuid.UUID) -> Optional["GuideStatModel"]:
        query = select(cls).where(cls.id == stat_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_guide_id(cls, session: AsyncSession, guide_id: uuid.UUID) -> List["GuideStatModel"]:
        query = select(cls).where(cls.guide_id == guide_id)
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def get_by_guide_master(cls, session: AsyncSession, guide_id: uuid.UUID, master_id: uuid.UUID) -> uuid.UUID:
        query = select(cls.id).where(and_(cls.guide_id == guide_id, cls.master_id==master_id))
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID) -> List["GuideStatModel"]:
        query = select(cls).where(cls.master_id == master_id)
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def get_by_master_liked(cls, session: AsyncSession, master_id: uuid.UUID)->List["GuideStatModel"]:
        query = select(cls).where(and_(cls.master_id == master_id, cls.action == 1))
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def check_like(cls, session: AsyncSession, master_id: uuid.UUID, guide_id: uuid.UUID):
        query = select(cls).where(and_(cls.guide_id==guide_id, cls.master_id==master_id, cls.action==1))
        result = await session.execute(query)
        return result.scalars().first() is not None

    @classmethod
    async def get_guide_stats(cls, session: AsyncSession, guide_id: uuid.UUID) -> dict:
        """Возвращает агрегированную статистику по гайду: просмотры и лайки"""
        query = select(cls.action, func.count(cls.id)).where(cls.guide_id == guide_id).group_by(cls.action)
        result = await session.execute(query)

        stats = {"views": 0, "likes": 0}
        for action, count in result.all():
            if action == 0 or action == 1:
                stats["views"] = count
            if action == 1:
                stats["likes"] = count
        return stats

    @classmethod
    async def update(cls, session: AsyncSession, stat_id: uuid.UUID, update_data: dict) -> str:
        query = update(cls).where(cls.id == stat_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, stat_id: uuid.UUID) -> str:
        obj = await session.get(cls, stat_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such stat"

    @classmethod
    async def toggle_action(cls, session: AsyncSession, stat_id: uuid.UUID) -> int:
        obj = await session.get(cls, stat_id)
        if not obj:
            raise ValueError(f"Stat with id {stat_id} not found")

        obj.action = 1 - obj.action  # переключение
        await session.flush()  # отправляем изменение в БД без фиксации транзакции
        return obj.action

    @classmethod
    async def preupload_liked(cls, session: AsyncSession, master_id: uuid.UUID):
        stmt_liked_stats = (
            select(cls)
            .where(and_(cls.master_id == master_id, cls.action == 1))
            .options(
                selectinload(cls.guide).selectinload(GuidesModel.guide_stats),
                selectinload(cls.guide).selectinload(GuidesModel.video_steps_list)
            )
        )
        result = await session.execute(stmt_liked_stats)
        liked_stats = result.scalars().all()
        return [stat.guide for stat in liked_stats]

class EarningsModel(Base):
    __tablename__ = "earnings"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    price: Mapped[int]
    date: Mapped[date]
    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"))

    # Relationships
    master: Mapped["MasterModel"] = relationship("MasterModel", back_populates="earnings")

    @classmethod
    async def create(cls, session: AsyncSession, data: dict):
        earning = cls(**data)
        session.add(earning)
        await session.flush()
        return earning.id

    @classmethod
    async def get_by_id(cls, session: AsyncSession, earning_id: uuid.UUID):
        query = select(cls).where(cls.id == earning_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID):
        query = select(cls).where(cls.master_id == master_id).order_by(cls.date.desc())
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_by_date_range(cls, session: AsyncSession, master_id: uuid.UUID, start_date: date, end_date: date):
        query = select(cls).where(
            and_(cls.master_id == master_id, cls.date >= start_date, cls.date <= end_date)
        )
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def update(cls, session: AsyncSession, earning_id: uuid.UUID, update_data: dict):
        query = update(cls).where(cls.id == earning_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, earning_id: uuid.UUID):
        obj = await session.get(cls, earning_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such earning"


class PrepayModel(Base):
    __tablename__ = "prepayments"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    percent: Mapped[int]
    start_date: Mapped[date]
    end_date: Mapped[date]
    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"))

    # Relationships
    master: Mapped["MasterModel"] = relationship("MasterModel", back_populates="prepayments")

    @classmethod
    async def create(cls, session: AsyncSession, data: dict):
        prepay = cls(**data)
        session.add(prepay)
        await session.flush()
        return prepay.id

    @classmethod
    async def get_by_id(cls, session: AsyncSession, prepay_id: uuid.UUID):
        query = select(cls).where(cls.id == prepay_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID):
        query = select(cls).where(cls.master_id == master_id).order_by(cls.start_date.desc())
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_active_by_date(cls, session: AsyncSession, master_id: uuid.UUID, check_date: date):
        query = select(cls).where(
            and_(
                cls.master_id == master_id,
                cls.start_date <= check_date,
                cls.end_date >= check_date
            )
        )
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def update(cls, session: AsyncSession, prepay_id: uuid.UUID, update_data: dict):
        query = update(cls).where(cls.id == prepay_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, prepay_id: uuid.UUID):
        obj = await session.get(cls, prepay_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such prepayment"


class MasterNotificationModel(Base):
    __tablename__ = "master_notifications"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"),
                                                 unique=True)

    # Уведомления
    appointment_notification: Mapped[bool] = mapped_column(default=True)  # уведомление о записи
    appointment_cancel_notification: Mapped[bool] = mapped_column(default=True)  # уведомление об отмене записи
    appointment_confirm_notification: Mapped[bool] = mapped_column(default=True)  # подтверждение записи
    guide_approved_notification: Mapped[bool] = mapped_column(default=True)  # уведомление об одобрении гайда
    subscription_ending_notification: Mapped[bool] = mapped_column(
        default=True)  # уведомление о заканчивающейся подписке

    # Relationships
    master: Mapped["MasterModel"] = relationship("MasterModel", back_populates="notifications")

    @classmethod
    async def create(cls, session: AsyncSession, master_id: uuid.UUID) -> uuid.UUID:
        """Создание настроек уведомлений для мастера"""
        notification = cls(master_id=master_id)
        session.add(notification)
        await session.flush()
        return notification.id

    @classmethod
    async def get_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID):
        """Получение настроек уведомлений по master_id"""
        query = select(cls).where(cls.master_id == master_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def update(cls, session: AsyncSession, master_id: uuid.UUID, update_data: dict) -> str:
        """Обновление настроек уведомлений"""
        query = update(cls).where(cls.master_id == master_id).values(**update_data)
        await session.execute(query)
        return "success"


class SubscriptionModel(Base):
    __tablename__ = "subscriptions"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"),
                                                 unique=True)
    start_date: Mapped[date]
    end_date: Mapped[date]
    is_first_subscription: Mapped[bool] = mapped_column(default=True)  # Первая ли это подписка
    level: Mapped[int] = mapped_column(nullable=False)

    # Relationships
    master: Mapped["MasterModel"] = relationship("MasterModel", back_populates="subscription", uselist=False)

    @classmethod
    async def create(cls, session: AsyncSession, data: dict):
        subscription = cls(**data)
        session.add(subscription)
        await session.flush()
        return subscription.id

    @classmethod
    async def count_active_by_level(cls, session: AsyncSession, level: int) -> int:
        """Возвращает количество активных подписок указанного уровня на сегодняшний день."""
        today = date.today()
        query = select(func.count(cls.id)).where(
            cls.level == level,
            cls.start_date <= today,
            cls.end_date >= today
        )
        result = await session.execute(query)
        return result.scalar() or 0

    @classmethod
    async def get_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID):
        query = select(cls).where(cls.master_id == master_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def is_active(cls, session: AsyncSession, master_id: uuid.UUID, day: date):
        query = select(cls).where(cls.master_id==master_id, day>=cls.start_date, day<=cls.end_date)
        result = await session.execute(query)
        if result.scalars().first() != None:
            return True
        return False

    @classmethod
    async def update(cls, session: AsyncSession, subscription_id: uuid.UUID, update_data: dict):
        query = update(cls).where(cls.id == subscription_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    def update_sync(cls, session, subscription_id: uuid.UUID, update_data: dict):
        query = update(cls).where(cls.id == subscription_id).values(**update_data)
        session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, subscription_id: uuid.UUID):
        obj = await session.get(cls, subscription_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such subscription"

class MasterReferralModel(Base):
    __tablename__ = "master_referrals"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"),
                                                 unique=True)
    invited_masters_count: Mapped[int] = mapped_column(BigInteger, default=0)

    # Relationships
    master: Mapped["MasterModel"] = relationship("MasterModel", back_populates="referral_stats", uselist=False)

    @classmethod
    async def create(cls, session: AsyncSession, master_id: uuid.UUID) -> uuid.UUID:
        """Создание статистики рефералов для мастера"""
        referral = cls(master_id=master_id)
        session.add(referral)
        await session.flush()
        return referral.id

    @classmethod
    async def get_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID):
        """Получение статистики рефералов мастера"""
        query = select(cls).where(cls.master_id == master_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def increment_masters(cls, session: AsyncSession, master_id: uuid.UUID) -> str:
        """Увеличить счетчик приглашенных мастеров"""
        query = update(cls).where(cls.master_id == master_id).values(
            invited_masters_count=cls.invited_masters_count + 1
        )
        await session.execute(query)
        return "success"


    @classmethod
    async def get_stats(cls, session: AsyncSession, master_id: uuid.UUID) -> Optional[dict]:
        """Получить полную статистику рефералов"""
        referral = await cls.get_by_master_id(session=session, master_id=master_id)
        if not referral:
            return None
        return {
            "invited_masters": referral.invited_masters_count
        }

class CardModel(Base):
    __tablename__ = "cards"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    last_digits: Mapped[int]
    amount_digits: Mapped[int]
    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"))

    # Relationships
    master: Mapped["MasterModel"] = relationship("MasterModel", back_populates="cards")

    @classmethod
    async def create(cls, session: AsyncSession, data: dict):
        card = cls(**data)
        session.add(card)
        await session.flush()
        return card.id

    @classmethod
    async def get_by_id(cls, session: AsyncSession, card_id: uuid.UUID):
        query = select(cls).where(cls.id == card_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID):
        query = select(cls).where(cls.master_id == master_id)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def update(cls, session: AsyncSession, card_id: uuid.UUID, update_data: dict) -> str:
        query = update(cls).where(cls.id == card_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, card_id: uuid.UUID) -> str:
        obj = await session.get(cls, card_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such card"

class WorkFilesModel(Base):
    __tablename__ = "work_files"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String)
    filepath: Mapped[str] = mapped_column(String)

    # Relationships
    master: Mapped["MasterModel"] = relationship("MasterModel", back_populates="work_files")

    @classmethod
    async def create(cls, session: AsyncSession, data: dict):
        file_obj = cls(**data)
        session.add(file_obj)
        await session.flush()
        return file_obj.id

    @classmethod
    async def get_by_id(cls, session: AsyncSession, file_id: uuid.UUID):
        query = select(cls).where(cls.id == file_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID):
        query = select(cls).where(cls.master_id == master_id)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_by_master_name(cls, session: AsyncSession, master_id: uuid.UUID, name: str):
        query = select(cls).where(and_(cls.master_id == master_id, cls.name == name))
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def delete(cls, session: AsyncSession, file_id: uuid.UUID):
        obj = await session.get(cls, file_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such file"

    @classmethod
    async def update(cls, session: AsyncSession, file_id: uuid.UUID, update_data: dict) -> str:
        query = update(cls).where(cls.id == file_id).values(**update_data)
        await session.execute(query)
        return "success"

class RatingModel(Base):
    __tablename__ = "ratings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    rating: Mapped[float] = mapped_column(default=0.0)  # например, от 0 до 5

    # Уникальность: один пользователь – одна оценка мастеру
    __table_args__ = (
        UniqueConstraint("master_id", "user_id", name="uq_rating_master_user"),
    )

    # Relationships (будут добавлены в MasterModel и UserModel)
    master: Mapped["MasterModel"] = relationship("MasterModel", back_populates="ratings")
    user: Mapped["UserModel"] = relationship("UserModel", back_populates="ratings")

    @classmethod
    async def create(cls, session: AsyncSession, data: dict) -> uuid.UUID:
        """Создаёт новую оценку"""
        rating = cls(**data)
        session.add(rating)
        await session.flush()
        return rating.id

    @classmethod
    async def get_by_master_user(cls, session: AsyncSession, master_id: uuid.UUID, user_id: uuid.UUID):
        """Получить оценку конкретного пользователя для мастера"""
        query = select(cls).where(cls.master_id == master_id, cls.user_id == user_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_avg_rating_for_master(cls, session: AsyncSession, master_id: uuid.UUID) -> float:
        """Средний рейтинг мастера"""
        result = await session.execute(
            select(func.avg(cls.rating)).where(cls.master_id == master_id)
        )
        avg = result.scalar()
        return float(avg) if avg is not None else 0.0

    @classmethod
    async def get_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID):
        """Все оценки мастера"""
        query = select(cls).where(cls.master_id == master_id)
        result = await session.execute(query)
        return result.scalars().all()

class MasterConstantUsersModel(Base):
    __tablename__ = "master_constant_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    master_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("masters.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    # Уникальность пары (мастер + пользователь)
    __table_args__ = (
        UniqueConstraint("master_id", "user_id", name="uq_const_user_master"),
    )

    # Relationships
    master: Mapped["MasterModel"] = relationship("MasterModel", back_populates="constant_users")
    user: Mapped["UserModel"] = relationship("UserModel", back_populates="constant_masters")

    @classmethod
    async def create(cls, session: AsyncSession, data: dict) -> uuid.UUID:
        """Добавляет пользователя в постоянные клиенты мастера"""
        entry = cls(**data)
        session.add(entry)
        await session.flush()
        return entry.id

    @classmethod
    async def get_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID):
        """Список всех постоянных клиентов мастера"""
        query = select(cls).where(cls.master_id == master_id)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_by_user_id(cls, session: AsyncSession, user_id: uuid.UUID):
        """Список мастеров, у которых данный пользователь является постоянным клиентом"""
        query = select(cls.master_id).where(cls.user_id == user_id)
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def is_constant(cls, session: AsyncSession, master_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Проверяет, является ли пользователь постоянным клиентом мастера"""
        query = select(cls).where(cls.master_id == master_id, cls.user_id == user_id)
        result = await session.execute(query)
        return result.scalars().first() is not None

    @classmethod
    async def delete(cls, session: AsyncSession, entry_id: uuid.UUID) -> str:
        """Удаляет связь постоянного клиента"""
        obj = await session.get(cls, entry_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such relation"

class HeadbeautySessionModel(Base):
    __tablename__ = "headbeauty_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    gender: Mapped[bool] = mapped_column(Boolean, nullable=False)  # 0 – мужской, 1 – женский
    img_url: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[date] = mapped_column(Date, default=date.today)  # дата создания сессии

    face_parameters: Mapped[Optional["FaceParametersModel"]] = relationship(
        "FaceParametersModel",
        back_populates="session",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False  # один-к-одному
    )
    recommendation: Mapped[Optional["HaircutRecommendationModel"]] = relationship(
        "HaircutRecommendationModel",
        back_populates="session",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False
    )

    @classmethod
    async def count_gender_session(cls, session: AsyncSession, gender: bool) -> int:
        """Возвращает количество мужских сессий (gender = False)."""
        query = select(func.count(cls.id)).where(cls.gender == gender)
        result = await session.execute(query)
        return result.scalar() or 0

    @classmethod
    async def create(cls, session: AsyncSession, data: dict) -> uuid.UUID:
        """Создаёт новую запись сессии"""
        # Если в data нет created_at, оно подставится автоматически благодаря default
        obj = cls(**data)
        session.add(obj)
        await session.flush()
        return obj.id

    @classmethod
    async def get_by_chat_id(cls, session: AsyncSession, chat_id: int):
        """Получает сессию по chat_id"""
        query = select(cls).where(cls.chat_id == chat_id).order_by(cls.created_at.desc())
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_by_id(cls, session: AsyncSession, session_id: uuid.UUID) -> Optional["HeadbeautySessionModel"]:
        """Получает сессию по id"""
        query = select(cls).where(cls.id == session_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def update(cls, session: AsyncSession, session_id: uuid.UUID, update_data: dict) -> str:
        """Обновляет поля сессии (кроме created_at, если оно явно не передано)"""
        query = update(cls).where(cls.id == session_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, session_id: uuid.UUID) -> str:
        """Удаляет сессию по id"""
        obj = await session.get(cls, session_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such session"

class HaircutTemplateModel(Base):
    __tablename__ = "haircut_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gender: Mapped[bool] = mapped_column(Boolean, nullable=False)          # False – мужской, True – женский
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    face_type_recommendations: Mapped[str] = mapped_column(String, nullable=False)
    hair_type_recommendations: Mapped[str] = mapped_column(String, nullable=False)
    jawline: Mapped[str] = mapped_column(String, nullable=False)
    forehead_height: Mapped[str] = mapped_column(String, nullable=False)
    cheekbones: Mapped[str] = mapped_column(String, nullable=False)
    neck_length: Mapped[str] = mapped_column(String, nullable=False)
    img_url: Mapped[str] = mapped_column(String, nullable=False)

    @classmethod
    async def create(cls, session: AsyncSession, data: dict) -> uuid.UUID:
        """Создаёт новый шаблон стрижки"""
        template = cls(**data)
        session.add(template)
        await session.flush()
        return template.id

    @classmethod
    async def get_by_id(cls, session: AsyncSession, template_id: uuid.UUID) -> Optional["HaircutTemplateModel"]:
        """Получает шаблон по ID"""
        query = select(cls).where(cls.id == template_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    def get_by_id_sync(cls, session, template_id: uuid.UUID) -> Optional["HaircutTemplateModel"]:
        """Получает шаблон по ID"""
        query = select(cls).where(cls.id == template_id)
        result = session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_all_by_gender(cls, gender: bool, session: AsyncSession) -> List["HaircutTemplateModel"]:
        """Получает все шаблоны"""
        query = select(cls).where(gender == cls.gender)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_by_gender(cls, session: AsyncSession, gender: bool) -> List["HaircutTemplateModel"]:
        """Получает шаблоны по полу (False – мужские, True – женские)"""
        query = select(cls).where(cls.gender == gender)
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def update(cls, session: AsyncSession, template_id: uuid.UUID, update_data: dict) -> str:
        """Обновляет данные шаблона"""
        query = update(cls).where(cls.id == template_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, template_id: uuid.UUID) -> str:
        """Удаляет шаблон по ID"""
        obj = await session.get(cls, template_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such template"

    @classmethod
    async def get_all(cls, session: AsyncSession) -> List["HaircutTemplateModel"]:
        """Получает все шаблоны"""
        query = select(cls)
        result = await session.execute(query)
        return list(result.scalars().all())

class FaceParametersModel(Base):
    __tablename__ = "face_parameters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("headbeauty_sessions.id", ondelete="CASCADE"),
        nullable=False
    )
    face_type: Mapped[str] = mapped_column(String, nullable=False)
    hair_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    resume: Mapped[str] = mapped_column(String, nullable=False)
    eye_type: Mapped[str] = mapped_column(String, nullable=False)
    skin_color: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    jawline: Mapped[str] = mapped_column(String, nullable=False)
    forehead_height: Mapped[str] = mapped_column(String, nullable=False)
    cheekbones: Mapped[str] = mapped_column(String, nullable=False)
    neck_length: Mapped[str] = mapped_column(String, nullable=False)
    beard_facial_features: Mapped[str] = mapped_column(String, nullable=False)
    skin_temperature: Mapped[str] = mapped_column(String, nullable=False)
    contrast: Mapped[str] = mapped_column(String, nullable=False)
    eye_color: Mapped[str] = mapped_column(String, nullable=False)
    hair_color: Mapped[str] = mapped_column(String, nullable=False)

    # Связь с сессией (обратная)
    session: Mapped["HeadbeautySessionModel"] = relationship(
        "HeadbeautySessionModel",
        back_populates="face_parameters"
    )

    @classmethod
    def create(cls, session, data: dict) -> uuid.UUID:
        """Создаёт запись параметров лица"""
        obj = cls(**data)
        session.add(obj)
        session.flush()
        return obj.id

    @classmethod
    async def get_by_session_id(
        cls, session: AsyncSession, session_id: uuid.UUID
    ) -> Optional["FaceParametersModel"]:
        """Получает параметры по ID сессии (предполагается одна запись)"""
        query = select(cls).where(cls.session_id == session_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_id(
        cls, session: AsyncSession, param_id: uuid.UUID
    ) -> Optional["FaceParametersModel"]:
        """Получает параметры по ID записи"""
        query = select(cls).where(cls.id == param_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def update(cls, session: AsyncSession, param_id: uuid.UUID, update_data: dict) -> str:
        """Обновляет параметры лица"""
        query = update(cls).where(cls.id == param_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, param_id: uuid.UUID) -> str:
        """Удаляет запись параметров"""
        obj = await session.get(cls, param_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such face parameters"

class HaircutRecommendationModel(Base):
    __tablename__ = "haircut_recommendations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("headbeauty_sessions.id", ondelete="CASCADE"),
        nullable=False
    )
    recommended_haircuts: Mapped[str] = mapped_column(String, nullable=True)  # список рекомендаций
    recommended_beards: Mapped[str] = mapped_column(String, nullable=True)
    recommended_colors: Mapped[str] = mapped_column(String, nullable=True)

    # Связь с сессией
    session: Mapped["HeadbeautySessionModel"] = relationship(
        "HeadbeautySessionModel",
        back_populates="recommendation"
    )

    @classmethod
    def create(cls, session: AsyncSession, data: dict) -> uuid.UUID:
        """Создаёт запись рекомендаций"""
        obj = cls(**data)
        session.add(obj)
        session.flush()
        return obj.id

    @classmethod
    async def get_by_session_id(
        cls, session: AsyncSession, session_id: uuid.UUID
    ) -> Optional["HaircutRecommendationModel"]:
        """Получает рекомендации по ID сессии"""
        query = select(cls).where(cls.session_id == session_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    def get_by_session_id_sync(
            cls, session: AsyncSession, session_id: uuid.UUID
    ) -> Optional["HaircutRecommendationModel"]:
        """Получает рекомендации по ID сессии"""
        query = select(cls).where(cls.session_id == session_id)
        result = session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_id(
        cls, session: AsyncSession, rec_id: uuid.UUID
    ) -> Optional["HaircutRecommendationModel"]:
        """Получает рекомендации по ID записи"""
        query = select(cls).where(cls.id == rec_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    def update(cls, session: AsyncSession, rec_id: uuid.UUID, update_data: dict) -> str:
        """Обновляет рекомендации"""
        query = update(cls).where(cls.id == rec_id).values(**update_data)
        session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, rec_id: uuid.UUID) -> str:
        """Удаляет запись рекомендаций"""
        obj = await session.get(cls, rec_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such recommendation"


class FaceHairTemplateModel(Base):
    __tablename__ = "face_hair_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)          # подробное описание
    face_shape_recommendations: Mapped[str] = mapped_column(String, nullable=False)     # рекомендации по форме лица
    facial_features_recommendations: Mapped[str] = mapped_column(String, nullable=False) # рекомендации по чертам
    hair_color_recommendations: Mapped[str] = mapped_column(String, nullable=False)      # рекомендации по цвету волос
    img_url: Mapped[str] = mapped_column(String, nullable=False)             # ссылка на фото

    @classmethod
    async def create(cls, session: AsyncSession, data: dict) -> uuid.UUID:
        """Создаёт новый шаблон"""
        obj = cls(**data)
        session.add(obj)
        await session.flush()
        return obj.id

    @classmethod
    async def get_by_id(cls, session: AsyncSession, template_id: uuid.UUID) -> Optional["FaceHairTemplateModel"]:
        """Получает шаблон по ID"""
        query = select(cls).where(cls.id == template_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    def get_by_id_sync(cls, session, template_id: uuid.UUID) -> Optional["FaceHairTemplateModel"]:
        """Получает шаблон по ID"""
        query = select(cls).where(cls.id == template_id)
        result = session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_all(cls, session: AsyncSession) -> List["FaceHairTemplateModel"]:
        """Получает все шаблоны"""
        query = select(cls)
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def get_by_name(cls, session: AsyncSession, name: str) -> Optional["FaceHairTemplateModel"]:
        """Ищет шаблон по названию"""
        query = select(cls).where(cls.name == name)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def update(cls, session: AsyncSession, template_id: uuid.UUID, update_data: dict) -> str:
        """Обновляет данные шаблона"""
        query = update(cls).where(cls.id == template_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, template_id: uuid.UUID) -> str:
        """Удаляет шаблон по ID"""
        obj = await session.get(cls, template_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such template"

class ColorTemplateModel(Base):
    __tablename__ = "color_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    hex: Mapped[str] = mapped_column(String, nullable=False)
    skin_temperature: Mapped[str] = mapped_column(String, nullable=False)
    contrast: Mapped[str] = mapped_column(String, nullable=False)
    eye_color: Mapped[str] = mapped_column(String, nullable=False)
    skin_condition: Mapped[str] = mapped_column(String, nullable=False)

    @classmethod
    async def create(cls, session: AsyncSession, data: dict) -> uuid.UUID:
        """Создаёт новый шаблон цвета"""
        obj = cls(**data)
        session.add(obj)
        await session.flush()
        return obj.id

    @classmethod
    async def get_by_id(cls, session: AsyncSession, template_id: uuid.UUID) -> Optional["ColorTemplateModel"]:
        """Получает шаблон по ID"""
        query = select(cls).where(cls.id == template_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    def get_by_id_sync(cls, session: AsyncSession, template_id: uuid.UUID) -> Optional["ColorTemplateModel"]:
        """Получает шаблон по ID"""
        query = select(cls).where(cls.id == template_id)
        result = session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_all(cls, session: AsyncSession) -> List["ColorTemplateModel"]:
        """Получает все шаблоны"""
        query = select(cls)
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def get_by_name(cls, session: AsyncSession, name: str) -> Optional["ColorTemplateModel"]:
        """Ищет шаблон по названию"""
        query = select(cls).where(cls.name == name)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def update(cls, session: AsyncSession, template_id: uuid.UUID, update_data: dict) -> str:
        """Обновляет данные шаблона"""
        query = update(cls).where(cls.id == template_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, template_id: uuid.UUID) -> str:
        """Удаляет шаблон по ID"""
        obj = await session.get(cls, template_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such template"

class PermsTemplateModel(Base):
    __tablename__ = "perms_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    img_url: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)

    @classmethod
    async def create(cls, session: AsyncSession, data: dict) -> uuid.UUID:
        """Создаёт новый шаблон причёски/образа"""
        obj = cls(**data)
        session.add(obj)
        await session.flush()
        return obj.id

    @classmethod
    async def get_by_id(cls, session: AsyncSession, template_id: uuid.UUID) -> Optional["PermsTemplateModel"]:
        """Получает шаблон по ID"""
        query = select(cls).where(cls.id == template_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    def get_by_id_sync(cls, session, template_id: uuid.UUID) -> Optional["PermsTemplateModel"]:
        """Получает шаблон по ID"""
        query = select(cls).where(cls.id == template_id)
        result = session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_all(cls, session: AsyncSession) -> List["PermsTemplateModel"]:
        """Получает все шаблоны"""
        query = select(cls)
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def get_by_name(cls, session: AsyncSession, name: str) -> Optional["PermsTemplateModel"]:
        """Ищет шаблон по названию"""
        query = select(cls).where(cls.name == name)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def update(cls, session: AsyncSession, template_id: uuid.UUID, update_data: dict) -> str:
        """Обновляет данные шаблона"""
        query = update(cls).where(cls.id == template_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, template_id: uuid.UUID) -> str:
        """Удаляет шаблон по ID"""
        obj = await session.get(cls, template_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such template"

class TokenModel(Base):
    __tablename__ = "tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False)  # уникальность для одного пользователя
    tokens: Mapped[int] = mapped_column(BigInteger, default=1)
    super_tokens: Mapped[int] = mapped_column(BigInteger, default=1)

    @classmethod
    async def create(cls, session: AsyncSession, chat_id: int) -> uuid.UUID:
        """Создаёт запись баланса токенов для пользователя"""
        obj = cls(chat_id=chat_id)
        session.add(obj)
        await session.flush()
        return obj.id

    @classmethod
    async def get_by_chat_id(cls, session: AsyncSession, chat_id: int) -> Optional["TokenModel"]:
        """Получает запись по chat_id"""
        query = select(cls).where(cls.chat_id == chat_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_id(cls, session: AsyncSession, token_id: uuid.UUID) -> Optional["TokenModel"]:
        """Получает запись по id"""
        query = select(cls).where(cls.id == token_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def update(cls, session: AsyncSession, token_id: uuid.UUID, update_data: dict) -> str:
        """Обновляет произвольные поля (использовать с осторожностью)"""
        query = update(cls).where(cls.id == token_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def add_tokens(cls, session: AsyncSession, chat_id: int, amount: int) -> str:
        """Добавляет указанное количество обычных токенов"""
        query = update(cls).where(cls.chat_id == chat_id).values(
            tokens=cls.tokens + amount
        )
        await session.execute(query)
        return "success"

    @classmethod
    async def decrease_tokens(cls, session, chat_id: int) -> str:
        """Добавляет указанное количество обычных токенов"""
        query = update(cls).where(cls.chat_id == chat_id).values(
            tokens=cls.tokens - 1
        )
        await session.execute(query)
        return "success"

    @classmethod
    async def add_super_tokens(cls, session: AsyncSession, chat_id: int, amount: int) -> str:
        """Добавляет указанное количество супертокенов"""
        query = update(cls).where(cls.chat_id == chat_id).values(
            super_tokens=cls.super_tokens + amount
        )
        await session.execute(query)
        return "success"

    @classmethod
    async def decrease_super_tokens(cls, session: AsyncSession, chat_id: int) -> str:
        """Добавляет указанное количество супертокенов"""
        query = update(cls).where(cls.chat_id == chat_id).values(
            super_tokens=cls.super_tokens - 1
        )
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, token_id: uuid.UUID) -> str:
        """Удаляет запись по id"""
        obj = await session.get(cls, token_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such token record"


class PreviewModel(Base):
    __tablename__ = "previews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("headbeauty_sessions.id", ondelete="CASCADE"),
        nullable=False
    )
    img_url: Mapped[str] = mapped_column(String, nullable=False)
    model: Mapped[str] = mapped_column(String, nullable=False)
    saved: Mapped[bool] = mapped_column(Boolean, default=False)

    # Новое поле: дата и время создания (с часовым поясом, автоматически проставляется на стороне БД)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Связь с сессией (без back_populates, чтобы не менять HeadbeautySessionModel)
    session: Mapped["HeadbeautySessionModel"] = relationship("HeadbeautySessionModel")

    @classmethod
    async def create(cls, session: AsyncSession, session_id: uuid.UUID, img_url: str) -> uuid.UUID:
        """Создаёт запись превью для сессии"""
        obj = cls(session_id=session_id, img_url=img_url)
        session.add(obj)
        await session.flush()
        return obj.id

    @classmethod
    def create_sync(cls, session: AsyncSession, session_id: uuid.UUID, img_url: str, model: str) -> uuid.UUID:
        """Создаёт запись превью для сессии (синхронный flush)"""
        obj = cls(session_id=session_id, img_url=img_url, model=model)
        session.add(obj)
        session.flush()
        return obj.id

    @classmethod
    async def get_saved_stats_by_model(cls, session: AsyncSession, model: str) -> dict:
        """
        Возвращает статистику сохранённых превью для указанной модели.
        """
        total_query = select(func.count(cls.id)).where(cls.model == model)
        saved_query = select(func.count(cls.id)).where(cls.saved == True, cls.model == model)

        total_result = await session.execute(total_query)
        saved_result = await session.execute(saved_query)

        total = total_result.scalar() or 0
        saved = saved_result.scalar() or 0
        percentage = (saved / total * 100) if total > 0 else 0.0

        return {
            "model": model,
            "total": total,
            "saved": int(percentage),
        }

    @classmethod
    async def get_by_id(cls, session: AsyncSession, preview_id: uuid.UUID) -> Optional["PreviewModel"]:
        """Получает превью по ID"""
        query = select(cls).where(cls.id == preview_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_session_id(cls, session: AsyncSession, session_id: uuid.UUID) -> List["PreviewModel"]:
        """Получает все превью для указанной сессии"""
        query = select(cls).where(cls.session_id == session_id).order_by(cls.created_at.desc())
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def update(cls, session: AsyncSession, preview_id: uuid.UUID, new_img_url: str) -> str:
        """Обновляет URL изображения превью"""
        query = update(cls).where(cls.id == preview_id).values(img_url=new_img_url)
        await session.execute(query)
        return "success"

    @classmethod
    async def mark_saved(cls, session: AsyncSession, preview_id: uuid.UUID) -> str:
        """Обновляет URL изображения превью"""
        query = update(cls).where(cls.id == preview_id).values(saved=True)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, preview_id: uuid.UUID) -> str:
        """Удаляет превью по ID"""
        obj = await session.get(cls, preview_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such preview"

    @classmethod
    async def delete_by_session_id(cls, session: AsyncSession, session_id: uuid.UUID) -> str:
        """Удаляет все превью для сессии (опционально)"""
        query = delete(cls).where(cls.session_id == session_id)
        await session.execute(query)
        return "success"

class SubscriptionBankModel(Base):
    __tablename__ = "subscription_bank"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    master_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("masters.id", ondelete="CASCADE"),
        unique=True,  # у мастера только одна запись в банке подписок
        nullable=False
    )
    base_sub: Mapped[int] = mapped_column(BigInteger, default=0)        # количество базовых подписок
    partner_sub: Mapped[int] = mapped_column(BigInteger, default=0)     # количество партнёрских подписок
    change_level: Mapped[bool] = mapped_column(Boolean, default=False)  # разрешено ли менять уровень
    stop_sub: Mapped[bool] = mapped_column(Boolean, default=False)

    # Связь с мастером (один-к-одному)
    master: Mapped["MasterModel"] = relationship(
        "MasterModel",
        back_populates="subscription_bank",
        uselist=False
    )

    @classmethod
    async def create(cls, session: AsyncSession, master_id: uuid.UUID,
                     base_sub: int = 0, partner_sub: int = 0, change_level: bool = False) -> uuid.UUID:
        """Создаёт запись банка подписок для мастера"""
        obj = cls(
            master_id=master_id,
            base_sub=base_sub,
            partner_sub=partner_sub,
            change_level=change_level
        )
        session.add(obj)
        await session.flush()
        return obj.id

    @classmethod
    async def get_by_master_id(cls, session: AsyncSession, master_id: uuid.UUID) -> Optional["SubscriptionBankModel"]:
        """Получает запись по master_id"""
        query = select(cls).where(cls.master_id == master_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_id(cls, session: AsyncSession, record_id: uuid.UUID) -> Optional["SubscriptionBankModel"]:
        """Получает запись по id"""
        query = select(cls).where(cls.id == record_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def update(cls, session: AsyncSession, record_id: uuid.UUID, update_data: dict) -> str:
        """Обновляет произвольные поля (с осторожностью)"""
        query = update(cls).where(cls.id == record_id).values(**update_data)
        await session.execute(query)
        return "success"

    @classmethod
    async def delete(cls, session: AsyncSession, record_id: uuid.UUID) -> str:
        """Удаляет запись по id"""
        obj = await session.get(cls, record_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such subscription bank record"

    # Специализированные методы для работы с подписками
    @classmethod
    async def add_base_sub(cls, session: AsyncSession, master_id: uuid.UUID, amount: int) -> str:
        """Увеличивает количество базовых подписок"""
        query = update(cls).where(cls.master_id == master_id).values(
            base_sub=cls.base_sub + amount
        )
        await session.execute(query)
        return "success"

    @classmethod
    async def add_partner_sub(cls, session: AsyncSession, master_id: uuid.UUID, amount: int) -> str:
        """Увеличивает количество партнёрских подписок"""
        query = update(cls).where(cls.master_id == master_id).values(
            partner_sub=cls.partner_sub + amount
        )
        await session.execute(query)
        return "success"

    @classmethod
    def decrease_base_sub_sync(cls, session, master_id: uuid.UUID) -> str:
        """Увеличивает количество базовых подписок"""
        query = update(cls).where(cls.master_id == master_id).values(
            base_sub=cls.base_sub - 1,
            change_level = False
        )
        session.execute(query)
        return "success"

    @classmethod
    def decrease_partner_sub_sync(cls, session, master_id: uuid.UUID) -> str:
        """Увеличивает количество партнёрских подписок"""
        query = update(cls).where(cls.master_id == master_id).values(
            partner_sub=cls.partner_sub - 1,
            change_level=False
        )
        session.execute(query)
        return "success"

    @classmethod
    async def set_change_level(cls, session: AsyncSession, master_id: uuid.UUID, value: bool) -> str:
        """Устанавливает флаг разрешения смены уровня"""
        query = update(cls).where(cls.master_id == master_id).values(change_level=value)
        await session.execute(query)
        return "success"

    @classmethod
    async def get_balance(cls, session: AsyncSession, master_id: uuid.UUID) -> Optional[dict]:
        """Возвращает словарь с балансом подписок"""
        record = await cls.get_by_master_id(session, master_id)
        if not record:
            return None
        return {
            "base_sub": record.base_sub,
            "partner_sub": record.partner_sub,
            "change_level": record.change_level
        }

class SupportModel(Base):
    __tablename__ = "support_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    text: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[int] = mapped_column(default=SupportStatus.PENDING.value)
    created_at: Mapped[date] = mapped_column(Date, default=date.today)

    @classmethod
    async def create(cls, session: AsyncSession, chat_id: int, text: str) -> uuid.UUID:
        """Создаёт новую заявку в поддержку со статусом PENDING"""
        obj = cls(chat_id=chat_id, text=text, status=SupportStatus.PENDING.value)
        session.add(obj)
        await session.flush()
        return obj.id

    @classmethod
    async def get_by_id(cls, session: AsyncSession, request_id: uuid.UUID) -> Optional["SupportModel"]:
        """Получает заявку по ID"""
        query = select(cls).where(cls.id == request_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_by_chat_id(cls, session: AsyncSession, chat_id: int) -> List["SupportModel"]:
        """Получает все заявки пользователя (по chat_id)"""
        query = select(cls).where(cls.chat_id == chat_id).order_by(cls.created_at.desc())
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def get_pending(cls, session: AsyncSession) -> List["SupportModel"]:
        """Получает все нерешённые заявки"""
        query = select(cls).where(cls.status == SupportStatus.PENDING.value).order_by(cls.created_at.asc())
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def get_all(cls, session: AsyncSession) -> List["SupportModel"]:
        """Получает все заявки (для администрирования)"""
        query = select(cls)
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def update_status(cls, session: AsyncSession, request_id: uuid.UUID, new_status: SupportStatus) -> str:
        """Обновляет статус заявки"""
        query = update(cls).where(cls.id == request_id).values(status=new_status.value)
        await session.execute(query)
        return "success"

    @classmethod
    async def mark_solved(cls, session: AsyncSession, request_id: uuid.UUID) -> str:
        """Помечает заявку как решённую (SOLVED)"""
        return await cls.update_status(session, request_id, SupportStatus.SOLVED)

    @classmethod
    async def delete(cls, session: AsyncSession, request_id: uuid.UUID) -> str:
        """Удаляет заявку по ID"""
        obj = await session.get(cls, request_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such support request"

class UsageStatus(Enum):
    SPENT = 1       # потрачено
    PURCHASED = 2   # куплено

class TokenTypes(Enum):
    BASE = 1        # обычные токены
    SUPER = 2       # супертокены

class TokenUsageModel(Base):
    __tablename__ = "token_usage"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)          # количество (положительное для покупки, отрицательное для траты – но у нас отдельные статусы)
    status: Mapped[int] = mapped_column(BigInteger, nullable=False)          # UsageStatus
    token_type: Mapped[int] = mapped_column(BigInteger, nullable=False)      # TokenTypes
    created_at: Mapped[date] = mapped_column(Date, default=date.today)       # дата автоматически
    costage: Mapped[int] = mapped_column(BigInteger, nullable=True)

    @classmethod
    async def create(
        cls,
        session: AsyncSession,
        amount: int,
        status: UsageStatus,
        token_type: TokenTypes
    ) -> uuid.UUID:
        """Создаёт запись об использовании токенов (трата или покупка)"""
        obj = cls(
            amount=amount,
            status=status.value,
            token_type=token_type.value
        )
        session.add(obj)
        await session.flush()
        return obj.id

    @classmethod
    async def create_sync(
            cls,
            session,
            amount: int,
            status: UsageStatus,
            token_type: TokenTypes
    ) -> uuid.UUID:
        """Создаёт запись об использовании токенов (трата или покупка)"""
        obj = cls(
            amount=amount,
            status=status.value,
            token_type=token_type.value
        )
        session.add(obj)
        session.flush()
        return obj.id

    @classmethod
    async def get_by_id(cls, session: AsyncSession, usage_id: uuid.UUID) -> Optional["TokenUsageModel"]:
        """Получает запись по id"""
        query = select(cls).where(cls.id == usage_id)
        result = await session.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_all(
        cls,
        session: AsyncSession,
        limit: int = 100,
        offset: int = 0
    ) -> List["TokenUsageModel"]:
        """Получает все записи с пагинацией (сортировка по убыванию даты)"""
        query = select(cls).order_by(cls.created_at.desc()).limit(limit).offset(offset)
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def get_all_last_month(
        cls,
        session: AsyncSession,
        days: int = 30,
        token_type: Optional[TokenTypes] = None
    ) -> dict:
        """
        Возвращает сумму потраченных и приобретённых токенов за последние `days` дней.
        Если указан `token_type` – статистика только по этому типу.
        """
        start_date = date.today() - timedelta(days=days)
        conditions = [cls.created_at >= start_date]
        if token_type is not None:
            conditions.append(cls.token_type == token_type.value)

        spent = await session.execute(
            select(func.sum(cls.amount))
            .where(*conditions, cls.status == UsageStatus.SPENT.value)
        )
        purchased = await session.execute(
            select(func.sum(cls.amount))
            .where(*conditions, cls.status == UsageStatus.PURCHASED.value)
        )
        purchased_costage = await session.execute(
            select(func.sum(cls.costage))
            .where(*conditions, cls.status == UsageStatus.PURCHASED.value)
        )

        total_spent = int(spent.scalar() or 0)
        total_purchased = int(purchased.scalar() or 0)
        total_costage = int(purchased_costage.scalar() or 0)

        return {
            "total_spent": total_spent,
            "total_purchased": total_purchased,
            "total_purchased_costage": total_costage,
        }

    @classmethod
    async def get_by_token_type(
        cls,
        session: AsyncSession,
        token_type: TokenTypes
    ) -> List["TokenUsageModel"]:
        """Получает записи для конкретного типа токенов"""
        query = select(cls).where(cls.token_type == token_type.value).order_by(cls.created_at.desc())
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def get_by_status(
        cls,
        session: AsyncSession,
        status: UsageStatus
    ) -> List["TokenUsageModel"]:
        """Получает записи с определённым статусом (трата или покупка)"""
        query = select(cls).where(cls.status == status.value).order_by(cls.created_at.desc())
        result = await session.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def delete(cls, session: AsyncSession, usage_id: uuid.UUID) -> str:
        """Удаляет запись по id"""
        obj = await session.get(cls, usage_id)
        if obj:
            await session.delete(obj)
            return "success"
        return "no such usage record"

    # Статистические методы
    @classmethod
    async def get_total_spent_by_type(
        cls,
        session: AsyncSession,
        token_type: TokenTypes
    ) -> int:
        """Суммарно потрачено токенов указанного типа (только SPENT)"""
        result = await session.execute(
            select(func.sum(cls.amount))
            .where(
                cls.token_type == token_type.value,
                cls.status == UsageStatus.SPENT.value
            )
        )
        total = result.scalar()
        return int(total) if total is not None else 0

    @classmethod
    async def get_total_purchased_by_type(
        cls,
        session: AsyncSession,
        token_type: TokenTypes
    ) -> int:
        """Суммарно куплено токенов указанного типа (только PURCHASED)"""
        result = await session.execute(
            select(func.sum(cls.amount))
            .where(
                cls.token_type == token_type.value,
                cls.status == UsageStatus.PURCHASED.value
            )
        )
        total = result.scalar()
        return int(total) if total is not None else 0

    @classmethod
    async def get_stats_by_type(
        cls,
        session: AsyncSession,
        token_type: TokenTypes
    ) -> dict:
        """Возвращает словарь со статистикой по конкретному типу"""
        spent = await cls.get_total_spent_by_type(session, token_type)
        purchased = await cls.get_total_purchased_by_type(session, token_type)
        balance = purchased - spent  # текущий баланс (остаток)
        return {
            "token_type": token_type.name,
            "total_spent": spent,
            "total_purchased": purchased,
            "balance": balance
        }

    @classmethod
    async def get_stats_all(cls, session: AsyncSession) -> dict:
        """Возвращает общую статистику по всем типам токенов"""
        stats = {}
        for token_type in TokenTypes:
            stats[token_type.name] = await cls.get_stats_by_type(session, token_type)
        return stats