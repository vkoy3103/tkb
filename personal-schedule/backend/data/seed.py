from datetime import time

from app.database import SessionLocal, engine, Base

from app.models.subject import Subject
from app.models.schedule import Schedule
from app.models.schedule_override import ScheduleOverride
from app.models.period import Period
from app.models.work_shift import WorkShift
from app.models.work_extra import WorkExtra
from app.models.setting import Setting
from app.models.work_extra_type import WorkExtraType


def seed_database():
    # Tạo tables nếu chưa có
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # =========================================================
        # 1. XÓA DỮ LIỆU SEED CŨ
        # =========================================================

        db.query(WorkExtra).delete()
        db.query(WorkShift).delete()
        db.query(Schedule).delete()
        db.query(Subject).delete()
        db.query(Period).delete()
        db.query(Setting).delete()

        db.commit()

        # =========================================================
        # 2. PERIODS
        # =========================================================

        periods = [
            Period(
                period_number=1,
                start_time=time(7, 0),
                end_time=time(8, 0),
                label="Tiết 1",
                note=None,
            ),
            Period(
                period_number=2,
                start_time=time(8, 0),
                end_time=time(9, 0),
                label="Tiết 2",
                note=None,
            ),
            Period(
                period_number=3,
                start_time=time(9, 0),
                end_time=time(10, 0),
                label="Tiết 3",
                note=None,
            ),
            Period(
                period_number=4,
                start_time=time(10, 0),
                end_time=time(11, 0),
                label="Tiết 4",
                note=None,
            ),
            Period(
                period_number=5,
                start_time=time(11, 0),
                end_time=time(12, 0),
                label="Tiết 5",
                note=None,
            ),
            Period(
                period_number=6,
                start_time=time(12, 30),
                end_time=time(13, 30),
                label="Tiết 6",
                note=None,
            ),
            Period(
                period_number=7,
                start_time=time(13, 30),
                end_time=time(14, 30),
                label="Tiết 7",
                note=None,
            ),
            Period(
                period_number=8,
                start_time=time(14, 30),
                end_time=time(15, 30),
                label="Tiết 8",
                note=None,
            ),
            Period(
                period_number=9,
                start_time=time(15, 30),
                end_time=time(16, 30),
                label="Tiết 9",
                note=None,
            ),
            Period(
                period_number=10,
                start_time=time(16, 30),
                end_time=time(17, 30),
                label="Tiết 10",
                note=None,
            ),
        ]

        db.add_all(periods)

        # =========================================================
        # 3. SUBJECTS
        # =========================================================

        subjects = [
            Subject(
                code="4130120.2610.25.10",
                name="Anh văn B1.1",
                credits=3,
                teacher="Nguyễn Thành Tâm",
                default_room="B102",
                color="#3B82F6",
                note=None,
                is_active=True,
            ),
            Subject(
                code="1023290.2610.25.10",
                name="Cơ sở dữ liệu",
                credits=2,
                teacher="Trương Ngọc Châu",
                default_room="E2.302",
                color="#10B981",
                note=None,
                is_active=True,
            ),
            Subject(
                code="0130101.2610.25.12",
                name="GDTC 3 BD Nam",
                credits=0,
                teacher="Khoa G.dục thể chất - ĐHĐN",
                default_room="GDTC",
                color="#F59E0B",
                note=None,
                is_active=True,
            ),
            Subject(
                code="3190121.2610.25.11",
                name="Giải tích 2",
                credits=4,
                teacher="Nguyễn Ngọc Thạch",
                default_room="F110",
                color="#EF4444",
                note=None,
                is_active=True,
            ),
            Subject(
                code="1023693.2610.25.10",
                name="Lập trình hướng đối tượng",
                credits=2.5,
                teacher="Đặng Hoài Phương",
                default_room="P6",
                color="#8B5CF6",
                note=None,
                is_active=True,
            ),
            Subject(
                code="1022913.2610.25.10",
                name="Nguyên lý hệ điều hành",
                credits=2.5,
                teacher="Trần Hồ Thủy Tiên",
                default_room="E2.302",
                color="#EC4899",
                note=None,
                is_active=True,
            ),
            Subject(
                code="1023690.2610.25.10B",
                name="PBL 2: Đồ án cơ sở lập trình",
                credits=2,
                teacher="Đặng Thiên Bình",
                default_room="B301",
                color="#6366F1",
                note=None,
                is_active=True,
            ),
            Subject(
                code="1022830.2610.25.10",
                name="Phân tích & thiết kế giải thuật (tiếng Anh)",
                credits=2,
                teacher="Đặng Thiên Bình",
                default_room="B301",
                color="#14B8A6",
                note=None,
                is_active=True,
            ),
            Subject(
                code="3050660.2610.25.10A",
                name="TN Vật lý (Cơ-Nhiệt)",
                credits=1,
                teacher="Mai Thị Kiều Liên",
                default_room="D211",
                color="#F97316",
                note=None,
                is_active=True,
            ),
        ]

        db.add_all(subjects)
        db.flush()

        # =========================================================
        # 4. CLASS SCHEDULES
        # =========================================================
        #
        # weekday:
        # 2 = Thứ 2
        # 3 = Thứ 3
        # 4 = Thứ 4
        # 5 = Thứ 5
        # 6 = Thứ 6
        # 7 = Thứ 7
        # 8 = Chủ nhật
        #
        # =========================================================

        class_schedules = [
            # Anh văn B1.1
            Schedule(
                subject_id=subjects[0].id,
                weekday=4,
                start_period=3,
                end_period=5,
                room="B102",
                week_start=1,
                week_end=16,
                note=None,
            ),

            # Cơ sở dữ liệu
            Schedule(
                subject_id=subjects[1].id,
                weekday=3,
                start_period=9,
                end_period=10,
                room="E2.302",
                week_start=1,
                week_end=16,
                note=None,
            ),

            # GDTC 3 BD Nam
            Schedule(
                subject_id=subjects[2].id,
                weekday=5,
                start_period=1,
                end_period=4,
                room="GDTC",
                week_start=1,
                week_end=15,
                note=None,
            ),

            # Giải tích 2
            Schedule(
                subject_id=subjects[3].id,
                weekday=5,
                start_period=6,
                end_period=9,
                room="F110",
                week_start=1,
                week_end=16,
                note=None,
            ),

            # Lập trình hướng đối tượng
            Schedule(
                subject_id=subjects[4].id,
                weekday=2,
                start_period=1,
                end_period=3,
                room="P6",
                week_start=1,
                week_end=14,
                note=None,
            ),

            # Nguyên lý hệ điều hành
            Schedule(
                subject_id=subjects[5].id,
                weekday=3,
                start_period=6,
                end_period=8,
                room="E2.302",
                week_start=1,
                week_end=14,
                note=None,
            ),

            # PBL 2
            Schedule(
                subject_id=subjects[6].id,
                weekday=6,
                start_period=9,
                end_period=10,
                room="B301",
                week_start=1,
                week_end=16,
                note=None,
            ),

            # Phân tích & thiết kế giải thuật
            Schedule(
                subject_id=subjects[7].id,
                weekday=6,
                start_period=7,
                end_period=8,
                room="B301",
                week_start=1,
                week_end=16,
                note=None,
            ),

            # TN Vật lý
            Schedule(
                subject_id=subjects[8].id,
                weekday=2,
                start_period=7,
                end_period=10,
                room="D211",
                week_start=1,
                week_end=4,
                note=None,
            ),
        ]

        db.add_all(class_schedules)

        # =========================================================
        # 5. SETTINGS
        # =========================================================

        settings = [
            Setting(
                key="NORMAL_RATE",
                value="20000",
                description="Lương ca NORMAL theo giờ",
            ),
            Setting(
                key="NPC_RATE",
                value="20000",
                description="Tiền NPC theo giờ",
            ),
            Setting(
                key="EXTEND_RATE",
                value="50000",
                description="Tiền mỗi lần EXTEND",
            ),
            Setting(
                key="OT_START_TIME",
                value="22:00",
                description="OT chỉ được tính từ 22:00",
            ),
            Setting(
                key="SHIFT_1_START",
                value="09:00",
                description="Giờ bắt đầu ca 1",
            ),
            Setting(
                key="SHIFT_1_END",
                value="13:00",
                description="Giờ kết thúc ca 1",
            ),
            Setting(
                key="SHIFT_2_START",
                value="13:00",
                description="Giờ bắt đầu ca 2",
            ),
            Setting(
                key="SHIFT_2_END",
                value="18:00",
                description="Giờ kết thúc ca 2",
            ),
            Setting(
                key="SHIFT_3_START",
                value="18:00",
                description="Giờ bắt đầu ca 3",
            ),
            Setting(
                key="SHIFT_3_END",
                value="22:00",
                description="Giờ kết thúc ca 3",
            ),
        ]

        db.add_all(settings)

        # =========================================================
        # 5. WORK EXTRA TYPES
        # =========================================================

        extra_types = [
            WorkExtraType(
                code="NPC",
                name="NPC",
                unit="HOUR",
                rate_type="FIXED",
                rate_value=20000,
                description="Làm NPC theo giờ",
                is_active=True,
            ),

            WorkExtraType(
                code="OT",
                name="OT",
                unit="HOUR",
                rate_type="MULTIPLIER",
                rate_value=2,
                description="Làm thêm sau 22:00, tính gấp đôi lương NORMAL",
                is_active=True,
            ),

            WorkExtraType(
                code="EXTEND",
                name="EXTEND",
                unit="TIME",
                rate_type="FIXED",
                rate_value=50000,
                description="Khách mua thêm giờ chơi",
                is_active=True,
            ),
        ]

        db.add_all(extra_types)

        # =========================================================
        # 6. COMMIT
        # =========================================================

        db.commit()

        print("========================================")
        print("Database seeded successfully!")
        print("Subjects: 9")
        print("Class schedules: 9")
        print("Periods: 10")
        print("Settings: 11")
        print("WorkExtraTypes: 3")
        print("========================================")

    except Exception as e:
        db.rollback()
        print("Seed failed!")
        print(e)
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()