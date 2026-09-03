from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class OtherIncome(Base):
    """Thu nhập khác (thưởng, phụ cấp, tip...) do người dùng tự nhập tiền.

    Mỗi khoản gắn với 1 ngày (date) → thuộc về đúng tháng của ngày đó,
    giúp trang Work hiển thị riêng theo từng tháng.
    """

    __tablename__ = "other_incomes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    note = Column(String(255), nullable=True)
    amount = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
