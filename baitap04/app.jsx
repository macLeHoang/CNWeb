/** @jsxRuntime classic */

const API_URL = "https://jsonplaceholder.typicode.com/users";

const EMPTY_USER = {
  name: "",
  username: "",
  email: "",
  address: { street: "", suite: "", city: "" },
  phone: "",
  website: "",
};

function cloneEmptyUser() {
  return { ...EMPTY_USER, address: { ...EMPTY_USER.address } };
}

function normalizeUser(user) {
  return {
    ...user,
    name: user.name.trim(),
    username: user.username.trim(),
    email: user.email.trim(),
    address: {
      street: user.address?.street?.trim() || "",
      suite: user.address?.suite?.trim() || "",
      city: user.address?.city?.trim() || "",
    },
    phone: user.phone.trim(),
    website: user.website.trim(),
  };
}

function validateUser(user) {
  const errors = {};
  if (!user.name.trim()) errors.name = "Vui lòng nhập họ và tên.";
  if (!user.username.trim()) errors.username = "Vui lòng nhập tên đăng nhập.";
  return errors;
}

function Modal({ title, titleId, children, onClose }) {
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">Thông tin người dùng</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function UserFormFields({ user, errors, onChange }) {
  const field = (id, label, options = {}) => (
    <div className={`form-field ${options.wide ? "form-field-wide" : ""}`}>
      <label htmlFor={id}>
        {label} {options.required && <span aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        type={options.type || "text"}
        value={options.address ? user.address[id] : user[id]}
        onChange={(event) => onChange(id, event.target.value, options.address)}
        placeholder={options.placeholder}
        autoComplete={options.autoComplete || "off"}
        aria-invalid={Boolean(errors[id])}
        aria-describedby={errors[id] ? `${id}-error` : undefined}
        autoFocus={id === "name"}
      />
      {errors[id] && (
        <small className="field-error" id={`${id}-error`}>
          {errors[id]}
        </small>
      )}
    </div>
  );

  return (
    <div className="form-grid">
      {field("name", "Họ và tên", {
        required: true,
        placeholder: "Nguyễn Văn An",
        autoComplete: "name",
      })}
      {field("username", "Tên đăng nhập", {
        required: true,
        placeholder: "nguyenvanan",
        autoComplete: "username",
      })}
      {field("email", "Email", {
        type: "email",
        placeholder: "an@example.com",
        autoComplete: "email",
      })}
      {field("phone", "Điện thoại", {
        type: "tel",
        placeholder: "090 123 4567",
        autoComplete: "tel",
      })}
      {field("street", "Đường", {
        address: true,
        placeholder: "Số 1 Đại Cồ Việt",
        autoComplete: "address-line1",
      })}
      {field("suite", "Căn hộ / Tòa nhà", {
        address: true,
        placeholder: "Tòa C1",
        autoComplete: "address-line2",
      })}
      {field("city", "Thành phố", {
        address: true,
        placeholder: "Hà Nội",
        autoComplete: "address-level2",
      })}
      {field("website", "Website", {
        placeholder: "example.com",
        autoComplete: "url",
      })}
    </div>
  );
}

function SearchForm({ keyword, onChangeValue }) {
  return (
    <label className="search-box">
      <span className="search-icon" aria-hidden="true">⌕</span>
      <span className="sr-only">Tìm kiếm người dùng</span>
      <input
        type="search"
        value={keyword}
        placeholder="Tìm theo tên hoặc username..."
        onChange={(event) => onChangeValue(event.target.value)}
      />
      {keyword && (
        <button
          type="button"
          className="clear-search"
          onClick={() => onChangeValue("")}
          aria-label="Xóa từ khóa tìm kiếm"
        >
          ×
        </button>
      )}
    </label>
  );
}

function AddUser({ onAdd }) {
  const [adding, setAdding] = React.useState(false);
  const [user, setUser] = React.useState(cloneEmptyUser);
  const [errors, setErrors] = React.useState({});

  const closeModal = React.useCallback(() => {
    setAdding(false);
    setErrors({});
  }, []);

  const handleChange = (id, value, isAddress) => {
    setUser((current) =>
      isAddress
        ? { ...current, address: { ...current.address, [id]: value } }
        : { ...current, [id]: value },
    );
    if (errors[id]) setErrors((current) => ({ ...current, [id]: "" }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validateUser(user);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onAdd(normalizeUser(user));
    setUser(cloneEmptyUser());
    setAdding(false);
  };

  return (
    <>
      <button className="button button-primary" type="button" onClick={() => setAdding(true)}>
        <span aria-hidden="true">＋</span> Thêm người dùng
      </button>

      {adding && (
        <Modal title="Thêm người dùng" titleId="add-user-title" onClose={closeModal}>
          <form onSubmit={handleSubmit} noValidate>
            <UserFormFields user={user} errors={errors} onChange={handleChange} />
            <div className="modal-actions">
              <button className="button button-secondary" type="button" onClick={closeModal}>
                Hủy
              </button>
              <button className="button button-primary" type="submit">
                Thêm người dùng
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function ResultTable({ keyword, user, onAdded }) {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [editing, setEditing] = React.useState(null);
  const [editErrors, setEditErrors] = React.useState({});
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetch(API_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => setUsers(data))
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") {
          setError("Không thể tải danh sách người dùng. Vui lòng kiểm tra kết nối mạng.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  React.useEffect(() => {
    if (!user || loading || error) return;
    setUsers((current) => {
      const nextId = current.length
        ? Math.max(...current.map((item) => Number(item.id) || 0)) + 1
        : 1;
      return [...current, { ...user, id: nextId, address: { ...user.address } }];
    });
    onAdded();
  }, [user, loading, error, onAdded]);

  const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi");
  const filteredUsers = users.filter((item) => {
    const name = item.name?.toLocaleLowerCase("vi") || "";
    const username = item.username?.toLocaleLowerCase("vi") || "";
    return name.includes(normalizedKeyword) || username.includes(normalizedKeyword);
  });

  const editUser = (selectedUser) => {
    setEditing({
      ...cloneEmptyUser(),
      ...selectedUser,
      address: { ...EMPTY_USER.address, ...selectedUser.address },
    });
    setEditErrors({});
  };

  const closeEditModal = React.useCallback(() => {
    setEditing(null);
    setEditErrors({});
  }, []);

  const handleEditChange = (id, value, isAddress) => {
    setEditing((current) =>
      isAddress
        ? { ...current, address: { ...current.address, [id]: value } }
        : { ...current, [id]: value },
    );
    if (editErrors[id]) setEditErrors((current) => ({ ...current, [id]: "" }));
  };

  const saveUser = (event) => {
    event.preventDefault();
    const nextErrors = validateUser(editing);
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const normalizedEditing = normalizeUser(editing);
    setUsers((current) =>
      current.map((item) => (item.id === normalizedEditing.id ? normalizedEditing : item)),
    );
    setEditing(null);
  };

  const removeUser = (id) => {
    setUsers((current) => current.filter((item) => item.id !== id));
  };

  if (loading) {
    return (
      <div className="status-card" role="status">
        <span className="spinner" aria-hidden="true"></span>
        <strong>Đang tải danh sách...</strong>
        <p>Dữ liệu đang được lấy từ JSONPlaceholder.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-card status-error" role="alert">
        <span className="status-symbol" aria-hidden="true">!</span>
        <strong>Tải dữ liệu thất bại</strong>
        <p>{error}</p>
        <button className="button button-secondary" type="button" onClick={() => setReloadKey((key) => key + 1)}>
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="table-summary" aria-live="polite">
        Hiển thị <strong>{filteredUsers.length}</strong> / {users.length} người dùng
      </div>

      {filteredUsers.length === 0 ? (
        <div className="status-card">
          <span className="status-symbol muted" aria-hidden="true">?</span>
          <strong>Không tìm thấy người dùng</strong>
          <p>Hãy thử một tên hoặc username khác.</p>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Người dùng</th>
                  <th>Liên hệ</th>
                  <th>Địa chỉ</th>
                  <th>Website</th>
                  <th className="actions-heading">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((item) => (
                  <tr key={item.id}>
                    <td><span className="id-badge">#{item.id}</span></td>
                    <td>
                      <strong className="user-name">{item.name}</strong>
                      <span className="secondary-text">@{item.username}</span>
                    </td>
                    <td>
                      <span>{item.email || "—"}</span>
                      <span className="secondary-text">{item.phone || "—"}</span>
                    </td>
                    <td>
                      {[item.address?.street, item.address?.suite, item.address?.city]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                    <td>{item.website || "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button className="action-button edit" type="button" onClick={() => editUser(item)}>
                          Sửa
                        </button>
                        <button className="action-button delete" type="button" onClick={() => removeUser(item.id)}>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <Modal title="Chỉnh sửa người dùng" titleId="edit-user-title" onClose={closeEditModal}>
          <form onSubmit={saveUser} noValidate>
            <UserFormFields user={editing} errors={editErrors} onChange={handleEditChange} />
            <div className="modal-actions">
              <button className="button button-secondary" type="button" onClick={closeEditModal}>
                Hủy
              </button>
              <button className="button button-primary" type="submit">
                Lưu thay đổi
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function App() {
  const [keyword, setKeyword] = React.useState("");
  const [newUser, setNewUser] = React.useState(null);
  const handleAdded = React.useCallback(() => setNewUser(null), []);

  return (
    <div className="app-shell">
      <header className="page-header">
        <div className="header-copy">
          <span className="brand-mark" aria-hidden="true">U</span>
          <div>
            <p className="eyebrow">React CRUD Dashboard</p>
            <h1>Quản lý người dùng</h1>
            <p className="subtitle">Tìm kiếm, thêm, chỉnh sửa và quản lý danh sách trên một giao diện.</p>
          </div>
        </div>
        <AddUser onAdd={setNewUser} />
      </header>

      <main>
        <section className="toolbar" aria-label="Công cụ quản lý">
          <SearchForm keyword={keyword} onChangeValue={setKeyword} />
          <div className="source-note">
            <span className="online-dot" aria-hidden="true"></span>
            Nguồn: JSONPlaceholder
          </div>
        </section>

        <ResultTable keyword={keyword} user={newUser} onAdded={handleAdded} />
      </main>

      <footer>
        Bài tập React CRUD · Dữ liệu thay đổi được lưu trong phiên hiện tại
      </footer>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
