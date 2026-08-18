import '../styles/pages.css'

export default function SettingsPage() {
  return (
    <div className="pg-page">
      <header className="pg-header">
        <div className="pg-header__left">
          <div className="pg-header__icon">🗄️</div>
          <div>
            <h2 className="pg-header__title">Dữ liệu</h2>
            <p className="pg-header__subtitle">Sao lưu và khôi phục cơ sở dữ liệu. (Cấu hình lương & ca làm đã chuyển sang trang Work.)</p>
          </div>
        </div>
      </header>

      <section className="pg-card">
        <div className="pg-card__head">
          <div>
            <h3 className="pg-card__title">Sao lưu / Phục hồi</h3>
            <p className="pg-card__subtitle">Xuất hoặc khôi phục cơ sở dữ liệu.</p>
          </div>
        </div>

        <div className="pg-list">
          <div className="pg-list-item">
            <div>
              <p className="pg-list-item__name">📤 Xuất cơ sở dữ liệu</p>
              <p className="pg-list-item__meta">Tải file schedule.db về máy.</p>
            </div>
            <div className="pg-list-item__actions">
              <button type="button" className="pg-btn pg-btn--ghost pg-btn--sm">
                Xuất
              </button>
            </div>
          </div>
          <div className="pg-list-item">
            <div>
              <p className="pg-list-item__name">📥 Khôi phục dữ liệu</p>
              <p className="pg-list-item__meta">Tải lên file SQLite để khôi phục.</p>
            </div>
            <div className="pg-list-item__actions">
              <button type="button" className="pg-btn pg-btn--primary pg-btn--sm">
                Chọn file
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
