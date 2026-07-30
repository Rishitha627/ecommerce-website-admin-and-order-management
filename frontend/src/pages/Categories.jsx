import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAddModal = () => {
    setEditMode(false);
    setCurrentId(null);
    setName('');
    setDescription('');
    setShowModal(true);
  };

  const handleOpenEditModal = (c) => {
    setEditMode(true);
    setCurrentId(c.id);
    setName(c.name);
    setDescription(c.description || '');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      alert('Category name is required');
      return;
    }

    try {
      if (editMode) {
        await axios.put(`/api/categories/${currentId}`, { name, description });
      } else {
        await axios.post('/api/categories', { name, description });
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      console.error('Error saving category:', err);
      alert(err.response?.data?.message || 'Error saving category');
    }
  };

  const handleDelete = async (id, catName) => {
    if (window.confirm(`Are you sure you want to delete category: "${catName}"? Products in this category will be marked uncategorized.`)) {
      try {
        await axios.delete(`/api/categories/${id}`);
        fetchCategories();
      } catch (err) {
        console.error('Error deleting category:', err);
        alert('Failed to delete category.');
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-slate-800">Categories Directory</h2>
          <p className="text-secondary mb-0">Create and organize departments to classify products in the store front.</p>
        </div>
        <button onClick={handleOpenAddModal} className="btn btn-primary d-flex align-items-center gap-2 fw-semibold">
          <i className="bi bi-plus-lg"></i> Add Category
        </button>
      </div>

      <div className="card card-premium p-4">
        <div className="table-responsive">
          <table className="table table-hover table-premium mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Category Name</th>
                <th>Description</th>
                <th>Created Date</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">No categories available. Add one to begin.</td>
                </tr>
              ) : (
                categories.map(c => (
                  <tr key={c.id}>
                    <td><strong>#{c.id}</strong></td>
                    <td className="fw-bold text-slate-800">{c.name}</td>
                    <td className="text-secondary" style={{ maxWidth: '400px' }}>{c.description || '—'}</td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-1.5">
                        <button onClick={() => handleOpenEditModal(c)} className="btn btn-outline-secondary btn-sm" title="Edit Category">
                          <i className="bi bi-pencil-fill"></i>
                        </button>
                        <button onClick={() => handleDelete(c.id, c.name)} className="btn btn-outline-danger btn-sm" title="Delete Category">
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: '14px' }}>
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold">{editMode ? 'Edit Category Details' : 'Add New Category'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body py-3">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Category Name *</label>
                    <input
                      type="text"
                      className="form-control form-control-premium"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Description</label>
                    <textarea
                      rows="3"
                      className="form-control form-control-premium"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-top-0 pt-0">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-4 fw-semibold">Save Category</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
