from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:123456@localhost:5432/myproject"

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT version()"))
        print("✅ Kết nối PostgreSQL thành công!")
        print(result.fetchone()[0])

except Exception as e:
    print("❌ Kết nối thất bại:")
    print(e)