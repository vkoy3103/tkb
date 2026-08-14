# Hướng Dẫn Chỉnh Sửa Lịch Học Inline

## Tổng Quan

Các component trong `ScheduleEditor.tsx` cho phép chỉnh sửa lịch học trực tiếp trên bảng timetable mà không cần form riêng biệt.

## Các Component Chính

### 1. `ScheduleModal`
Modal dialog cho phép:
- ✏️ Thêm mới lịch học
- 📝 Chỉnh sửa lịch học hiện tại
- 🗑️ Xóa lịch học (tùy chọn)

```tsx
import { ScheduleModal, FormGroup, FormSelect, FormInput } from './ScheduleEditor'

<ScheduleModal
  isOpen={isModalOpen}
  title="Chỉnh sửa lịch học"
  onClose={() => setIsModalOpen(false)}
  onSubmit={handleSubmit}
  showDeleteButton={true}
  onDelete={handleDelete}
  isLoading={isLoading}
>
  <FormGroup label="Môn học" required>
    <select value={formData.subject_id} onChange={...}>
      {/* options */}
    </select>
  </FormGroup>
</ScheduleModal>
```

### 2. `FormGroup, FormInput, FormSelect, FormTextarea`
Các thành phần form có style nhất quán:

```tsx
<FormInput
  label="Phòng học"
  value={formData.room}
  onChange={(e) => setFormData({...formData, room: e.target.value})}
  helper="Ví dụ: A101, B205"
  error={errors.room}
/>

<FormSelect
  label="Môn học"
  required
  options={subjects.map(s => ({ value: s.id, label: s.name }))}
  value={formData.subject_id}
  onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
/>

<FormTextarea
  label="Ghi chú"
  value={formData.note}
  onChange={(e) => setFormData({...formData, note: e.target.value})}
  placeholder="Nhập ghi chú thêm..."
/>
```

### 3. `ScheduleToast`
Thông báo kết quả thành công/lỗi:

```tsx
{showToast && (
  <ScheduleToast
    message={toastMessage}
    type={toastType}
    onClose={() => setShowToast(false)}
    autoClose={true}
  />
)}
```

### 4. `ContextMenu`
Menu chuột phải cho các thao tác nhanh:

```tsx
<ContextMenu
  x={contextMenu.x}
  y={contextMenu.y}
  items={[
    { label: 'Chỉnh sửa', icon: '✏️', onClick: handleEdit },
    { label: 'Xóa', icon: '🗑️', onClick: handleDelete, danger: true },
  ]}
  onClose={() => setContextMenu(null)}
/>
```

### 5. `ScheduleAlert`
Hiển thị cảnh báo/thông tin:

```tsx
<ScheduleAlert
  type="info"
  message="Lịch này là học bù"
  icon="🔄"
/>

<ScheduleAlert
  type="error"
  message="Đã có lỗi xảy ra"
/>
```

## Tích Hợp Vào Schedule Page

### Bước 1: Import các component

```tsx
import {
  ScheduleModal,
  FormGroup,
  FormInput,
  FormSelect,
  FormTextarea,
  FormRow,
  ScheduleToast,
  ScheduleAlert,
  ContextMenu,
} from '../components/ScheduleEditor'
```

### Bước 2: Thêm state cho modal

```tsx
const [isEditModalOpen, setIsEditModalOpen] = useState(false)
const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
const [isLoading, setIsLoading] = useState(false)
const [showToast, setShowToast] = useState(false)
const [toastMessage, setToastMessage] = useState('')
const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info')
const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
```

### Bước 3: Tạo handler cho các sự kiện

```tsx
// Xử lý click vào sự kiện lịch
const handleScheduleEventClick = (schedule: Schedule) => {
  setEditingSchedule(schedule)
  setIsEditModalOpen(true)
}

// Xử lý chuột phải
const handleContextMenu = (e: React.MouseEvent, schedule: Schedule) => {
  e.preventDefault()
  setEditingSchedule(schedule)
  setContextMenu({ x: e.clientX, y: e.clientY })
}

// Xử lý lưu
const handleSaveSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  setIsLoading(true)
  try {
    if (editingSchedule) {
      // Cập nhật lịch học hiện tại
      await updateSchedule(editingSchedule.id, formData)
      setToastMessage('Cập nhật lịch học thành công!')
      setToastType('success')
    } else {
      // Tạo lịch học mới
      await createSchedule(formData)
      setToastMessage('Thêm lịch học thành công!')
      setToastType('success')
    }
    setShowToast(true)
    setIsEditModalOpen(false)
    loadData()
  } catch (error) {
    setToastMessage('Có lỗi xảy ra: ' + (error as Error).message)
    setToastType('error')
    setShowToast(true)
  } finally {
    setIsLoading(false)
  }
}

// Xử lý xóa
const handleDeleteSchedule = async () => {
  if (!editingSchedule) return
  if (!confirm('Bạn chắc chắn muốn xóa lịch này?')) return
  
  setIsLoading(true)
  try {
    await deleteSchedule(editingSchedule.id)
    setToastMessage('Xóa lịch học thành công!')
    setToastType('success')
    setShowToast(true)
    setIsEditModalOpen(false)
    loadData()
  } catch (error) {
    setToastMessage('Không thể xóa lịch học')
    setToastType('error')
    setShowToast(true)
  } finally {
    setIsLoading(false)
  }
}
```

### Bước 4: Thêm vào JSX

```tsx
// Timetable component
<Timetable
  schedules={schedules}
  onScheduleClick={handleScheduleEventClick}
  onScheduleContextMenu={handleContextMenu}
  // ... props khác
/>

// Modal chỉnh sửa
<ScheduleModal
  isOpen={isEditModalOpen}
  title={editingSchedule ? 'Chỉnh sửa lịch học' : 'Thêm lịch học mới'}
  onClose={() => {
    setIsEditModalOpen(false)
    setEditingSchedule(null)
  }}
  onSubmit={handleSaveSchedule}
  showDeleteButton={!!editingSchedule}
  onDelete={handleDeleteSchedule}
  isLoading={isLoading}
>
  <FormRow>
    <FormSelect
      label="Môn học"
      required
      value={formData.subject_id}
      onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
      options={subjects.map(s => ({ value: s.id, label: s.name }))}
    />
    <FormSelect
      label="Thứ"
      required
      value={formData.weekday}
      onChange={(e) => setFormData({...formData, weekday: parseInt(e.target.value)})}
      options={weekdayOptions}
    />
  </FormRow>

  <FormRow>
    <FormSelect
      label="Tiết bắt đầu"
      required
      value={formData.start_period}
      onChange={(e) => setFormData({...formData, start_period: parseInt(e.target.value)})}
      options={periodOptions.map(p => ({ value: p.period_number, label: `Tiết ${p.period_number}` }))}
    />
    <FormSelect
      label="Tiết kết thúc"
      required
      value={formData.end_period}
      onChange={(e) => setFormData({...formData, end_period: parseInt(e.target.value)})}
      options={periodOptions.map(p => ({ value: p.period_number, label: `Tiết ${p.period_number}` }))}
    />
  </FormRow>

  <FormInput
    label="Phòng học"
    value={formData.room}
    onChange={(e) => setFormData({...formData, room: e.target.value})}
    placeholder="Ví dụ: A101"
  />

  <FormTextarea
    label="Ghi chú"
    value={formData.note}
    onChange={(e) => setFormData({...formData, note: e.target.value})}
    placeholder="Thêm ghi chú..."
  />
</ScheduleModal>

// Toast thông báo
{showToast && (
  <ScheduleToast
    message={toastMessage}
    type={toastType}
    onClose={() => setShowToast(false)}
  />
)}

// Context menu
{contextMenu && (
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    items={[
      {
        label: 'Chỉnh sửa',
        icon: '✏️',
        onClick: () => {
          setIsEditModalOpen(true)
          setContextMenu(null)
        },
      },
      {
        label: 'Xóa',
        icon: '🗑️',
        onClick: handleDeleteSchedule,
        danger: true,
      },
    ]}
    onClose={() => setContextMenu(null)}
  />
)}
```

## CSS Classes Có Sẵn

### Buttons
- `.btn` - Base button
- `.btn--primary` - Primary button
- `.btn--secondary` - Secondary button  
- `.btn--danger` - Danger button
- `.btn--danger-outline` - Outline danger button
- `.btn--small` - Small button
- `.btn--full` - Full width button

### Form
- `.form-group` - Form group container
- `.form-group__label` - Label
- `.form-group__input` - Input field
- `.form-group__select` - Select dropdown
- `.form-group__textarea` - Textarea
- `.form-group__error` - Error message
- `.form-row` - Grid row for form fields

### Badges
- `.schedule-event--makeup` - Học bù (có badge 🔄)
- `.schedule-event--holiday` - Lịch nghỉ (có badge 🚫)
- `.schedule-event--cancelled` - Hủy (có badge ✕)

## Ví Dụ Đầy Đủ

Xem file `src/pages/Schedule.tsx` để xem ví dụ tích hợp hoàn chỉnh với tất cả các tính năng:
- ✏️ Chỉnh sửa lịch trực tiếp
- ➕ Thêm lịch mới
- 🗑️ Xóa lịch
- 🔄 Học bù
- 🚫 Lịch nghỉ

## Styling & Themes

Tất cả component đều sử dụng CSS Variables từ `AppLayout.css`:
- `--color-primary`: Màu chính (#0f172a)
- `--color-secondary`: Màu phụ (#475569)
- `--color-border`: Màu border (#e2e8f0)
- `--shadow-md`: Box shadow
- `--radius-lg`: Border radius

Bạn có thể tùy chỉnh các biến này trong `:root` selector.
