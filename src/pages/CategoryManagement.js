import React, { useMemo, useState } from 'react';
import { useProducts } from '../context/ProductContext';
import UiIcon from '../components/UiIcon';

function CategoryManagement() {
  const { categories, addCategory, deleteCategory, updateCategory, addSubcategory, updateSubcategory, deleteSubcategory } = useProducts();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState('');
  const [newCategoryImageName, setNewCategoryImageName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editCategoryImageName, setEditCategoryImageName] = useState('');
  const [addingSubcategoryFor, setAddingSubcategoryFor] = useState(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [newSubcategoryImage, setNewSubcategoryImage] = useState('');
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editSubcategoryName, setEditSubcategoryName] = useState('');
  const [editSubcategoryImage, setEditSubcategoryImage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('name-asc');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const normalizedNames = useMemo(
    () =>
      categories.flatMap((category) => [
        category.name.toLowerCase(),
        ...(category.subcategories || []).map((subcategory) => subcategory.name.toLowerCase()),
      ]),
    [categories]
  );
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredCategories = useMemo(() => {
    if (!normalizedSearch) return categories;

    return categories.filter((category) => {
      const categoryName = String(category.name || '').toLowerCase();
      const subcategoryNames = (category.subcategories || [])
        .map((subcategory) => String(subcategory.name || '').toLowerCase())
        .join(' ');

      return categoryName.includes(normalizedSearch) || subcategoryNames.includes(normalizedSearch);
    });
  }, [categories, normalizedSearch]);
  const visibleCategories = useMemo(() => {
    const items = [...filteredCategories];

    items.sort((left, right) => {
      if (sortOption === 'name-desc') {
        return String(right.name || '').localeCompare(String(left.name || ''));
      }

      if (sortOption === 'subcategories-desc') {
        return (right.subcategories?.length || 0) - (left.subcategories?.length || 0);
      }

      if (sortOption === 'subcategories-asc') {
        return (left.subcategories?.length || 0) - (right.subcategories?.length || 0);
      }

      return String(left.name || '').localeCompare(String(right.name || ''));
    });

    return items;
  }, [filteredCategories, sortOption]);

  const readImageFile = (file, onLoad, onNameLoad) => {
    if (!file) return;
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedImageTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, WebP, or GIF image');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onLoad(typeof reader.result === 'string' ? reader.result : '');
      if (onNameLoad) onNameLoad(file.name);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleNewCategoryImageChange = (event) => {
    readImageFile(event.target.files?.[0], setNewCategoryImage, setNewCategoryImageName);
    event.target.value = '';
  };

  const handleEditCategoryImageChange = (event) => {
    readImageFile(event.target.files?.[0], setEditImage, setEditCategoryImageName);
    event.target.value = '';
  };

  const handleNewSubcategoryImageChange = (event) => {
    readImageFile(event.target.files?.[0], setNewSubcategoryImage);
    event.target.value = '';
  };

  const handleEditSubcategoryImageChange = (event) => {
    readImageFile(event.target.files?.[0], setEditSubcategoryImage);
    event.target.value = '';
  };

  const handleAddCategory = async () => {
    setError('');
    setSuccess('');

    if (!newCategoryName.trim()) {
      setError('Category name is required');
      return;
    }

    if (normalizedNames.includes(newCategoryName.trim().toLowerCase())) {
      setError('A category or subcategory with this name already exists');
      return;
    }

    try {
      const result = await addCategory({
        name: newCategoryName,
        image: newCategoryImage,
      });

      if (result) {
        setSuccess(`Category "${newCategoryName}" added successfully!`);
        setNewCategoryName('');
        setNewCategoryImage('');
        setNewCategoryImageName('');
      }
    } catch (err) {
      setError(err.message || 'Unable to add category');
    }
  };

  const handleUpdateCategory = async (oldName) => {
    setError('');
    setSuccess('');

    if (!editName.trim()) {
      setError('Category name is required');
      return;
    }

    const normalizedEditName = editName.trim().toLowerCase();
    const normalizedOldName = oldName.trim().toLowerCase();
    const isRenamingCategory = normalizedEditName !== normalizedOldName;
    const duplicate = isRenamingCategory && categories.some((category) => {
      if (category.name.toLowerCase() === normalizedEditName) return true;
      return (category.subcategories || []).some(
        (subcategory) => subcategory.name.toLowerCase() === normalizedEditName
      );
    });

    if (duplicate) {
      setError('A category or subcategory with this name already exists');
      return;
    }

    try {
      await updateCategory(oldName, { name: editName, image: editImage });
      setSuccess(`Category updated to "${editName}"!`);
      setEditingCategory(null);
      setEditName('');
      setEditImage('');
      setEditCategoryImageName('');
    } catch (err) {
      setError(err.message || 'Unable to update category');
    }
  };

  const handleDeleteCategory = (categoryName) => {
    if (window.confirm(`Are you sure you want to delete "${categoryName}"?`)) {
      deleteCategory(categoryName);
      setSuccess(`Category "${categoryName}" deleted successfully!`);
    }
  };

  const openCategoryEditor = (category) => {
    setEditingCategory(category.name);
    setEditName(category.name);
    setEditImage(category.image || '');
    setEditCategoryImageName(category.image ? 'Current image' : '');
  };

  const openAddSubcategoryEditor = (categoryName) => {
    setAddingSubcategoryFor(categoryName);
    setNewSubcategoryName('');
    setNewSubcategoryImage('');
  };

  const openSubcategoryEditor = (parentName, subcategory) => {
    setEditingSubcategory({
      parentName,
      name: subcategory.name,
    });
    setEditSubcategoryName(subcategory.name);
    setEditSubcategoryImage(subcategory.image || '');
  };

  const closeEditor = () => {
    setEditingCategory(null);
    setEditName('');
    setEditImage('');
    setEditCategoryImageName('');
  };

  const closeSubcategoryEditor = () => {
    setAddingSubcategoryFor(null);
    setNewSubcategoryName('');
    setNewSubcategoryImage('');
  };

  const closeEditSubcategoryEditor = () => {
    setEditingSubcategory(null);
    setEditSubcategoryName('');
    setEditSubcategoryImage('');
  };

  const handleAddSubcategory = async () => {
    setError('');
    setSuccess('');

    if (!addingSubcategoryFor) return;

    if (!newSubcategoryName.trim()) {
      setError('Subcategory name is required');
      return;
    }

    const duplicate = normalizedNames.includes(newSubcategoryName.trim().toLowerCase());

    if (duplicate) {
      setError('A category or subcategory with this name already exists');
      return;
    }

    try {
      const result = await addSubcategory(addingSubcategoryFor, {
        name: newSubcategoryName,
        image: newSubcategoryImage,
      });

      if (result) {
        setSuccess(`Subcategory "${newSubcategoryName}" added under "${addingSubcategoryFor}"!`);
        closeSubcategoryEditor();
      }
    } catch (err) {
      setError(err.message || 'Unable to add subcategory');
    }
  };

  const handleUpdateSubcategory = async () => {
    setError('');
    setSuccess('');

    if (!editingSubcategory) return;
    if (!editSubcategoryName.trim()) {
      setError('Subcategory name is required');
      return;
    }

    const normalizedEditSubcategoryName = editSubcategoryName.trim().toLowerCase();
    const duplicate = categories.some((category) => {
      if (category.name.toLowerCase() === normalizedEditSubcategoryName) return true;
      return (category.subcategories || []).some(
        (subcategory) =>
          subcategory.name.toLowerCase() === normalizedEditSubcategoryName &&
          subcategory.name !== editingSubcategory.name
      );
    });

    if (duplicate) {
      setError('A category or subcategory with this name already exists');
      return;
    }

    try {
      await updateSubcategory(editingSubcategory.parentName, editingSubcategory.name, {
        name: editSubcategoryName,
        image: editSubcategoryImage,
      });
      setSuccess(`Subcategory "${editSubcategoryName}" updated successfully!`);
      closeEditSubcategoryEditor();
    } catch (err) {
      setError(err.message || 'Unable to update subcategory');
    }
  };

  const handleDeleteSubcategory = async () => {
    setError('');
    setSuccess('');

    if (!editingSubcategory) return;
    if (!window.confirm(`Are you sure you want to delete "${editingSubcategory.name}"?`)) return;

    try {
      await deleteSubcategory(editingSubcategory.parentName, editingSubcategory.name);
      setSuccess(`Subcategory "${editingSubcategory.name}" deleted successfully!`);
      closeEditSubcategoryEditor();
    } catch (err) {
      setError(err.message || 'Unable to delete subcategory');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-2xl font-bold text-primary">
              <UiIcon name="folder" className="h-6 w-6" />
              Category Management
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Add categories above and manage all existing categories in one table below.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm">
            <span>{categories.length} categories</span>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-1">
            <h4 className="text-lg font-bold text-slate-900">Add Category</h4>
            <p className="text-sm text-slate-500">New categories will appear as new rows in the table.</p>
          </div>

          {(error || success) && (
            <div className="mb-4 grid gap-3">
              {error && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                  <UiIcon name="alert" className="h-4 w-4" />
                  {error}
                </div>
              )}

              {success && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                  <UiIcon name="check" className="h-4 w-4" />
                  {success}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Category Name</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div className="xl:w-[360px] space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Category Image</label>
              <label className="flex h-[50px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleNewCategoryImageChange}
                  className="hidden"
                />
                <span className="truncate">
                  {newCategoryImageName || (newCategoryImage ? 'Image selected' : 'Upload Category Image')}
                </span>
                {newCategoryImage ? (
                  <span className="flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    <span className="h-6 w-6 overflow-hidden rounded bg-white">
                      <img src={newCategoryImage} alt="New category preview" className="h-full w-full object-cover" />
                    </span>
                    Ready
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">No image</span>
                )}
              </label>
            </div>
            <button
              onClick={handleAddCategory}
              className="h-[50px] shrink-0 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white transition hover:bg-primary"
            >
              Add Category
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-md">
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Search Categories</label>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by category or subcategory"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>
          <div className="w-full max-w-xs">
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Sort By</label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-red-100"
            >
              <option value="name-asc">Category Name A-Z</option>
              <option value="name-desc">Category Name Z-A</option>
              <option value="subcategories-desc">Most Subcategories</option>
              <option value="subcategories-asc">Fewest Subcategories</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-5 py-4">Category Name</th>
                  <th className="px-5 py-4">Category Image</th>
                  <th className="px-5 py-4">Sub Categories</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {visibleCategories.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-5 py-10 text-center text-sm text-slate-500">
                      {normalizedSearch ? 'No matching categories found.' : 'No categories added yet.'}
                    </td>
                  </tr>
                ) : (
                  visibleCategories.map((category) => (
                    <tr key={category.name} className="align-top hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{category.name}</div>
                      </td>
                      <td className="px-5 py-4">
                        {category.image ? (
                          <div>
                            <div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                              <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">No image</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="max-w-[320px] text-sm text-slate-700">
                          {(category.subcategories || []).length > 0
                            ? (category.subcategories || []).map((subcategory, index) => (
                                <React.Fragment key={`${category.name}:${subcategory.name}`}>
                                  <button
                                    type="button"
                                    onClick={() => openSubcategoryEditor(category.name, subcategory)}
                                    className="font-medium text-blue-700 underline decoration-blue-200 underline-offset-2 transition hover:text-blue-900"
                                  >
                                    {subcategory.name}
                                  </button>
                                  {index < (category.subcategories || []).length - 1 ? ', ' : ''}
                                </React.Fragment>
                              ))
                            : 'No subcategories'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openAddSubcategoryEditor(category.name)}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            Add Subcategory
                          </button>
                          <button
                            onClick={() => openCategoryEditor(category)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.name)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            Delete
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

        {editingCategory && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4">
            {/* Modal: flex column capped at 90vh so it never overflows the screen */}
            <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl" style={{ maxHeight: '90vh' }}>

              {/* Header — always visible */}
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">Edit Category</h4>
                  <p className="text-sm text-slate-500">Update the category details here and manage its subcategories.</p>
                </div>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <UiIcon name="close" className="h-4 w-4" />
                </button>
              </div>

              {/* Body — scrolls when content is taller than remaining space */}
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl border border-primary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
                      autoFocus
                      placeholder="Category name"
                    />
                    <label
                      htmlFor="edit-category-image"
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                    >
                      <input
                        id="edit-category-image"
                        type="file"
                        accept="image/*"
                        onChange={handleEditCategoryImageChange}
                        className="sr-only"
                      />
                      <span>{editImage ? 'Change Category Image' : 'Upload Category Image'}</span>
                      <span className="max-w-[130px] truncate text-xs font-medium text-slate-400">
                        {editCategoryImageName || 'No image'}
                      </span>
                    </label>
                    {editImage ? (
                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="h-12 w-12 overflow-hidden rounded-lg bg-white">
                          <img src={editImage} alt={`${editName || editingCategory} preview`} className="h-full w-full object-cover" />
                        </div>
                        <span className="text-xs text-slate-500">Selected image preview</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">No image selected</div>
                    )}
                  </div>

                  {/* Subcategory panel — its own scroll so the list never pushes the modal off-screen */}
                  <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                      <div>
                        <h5 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-700">
                          Subcategories
                          {(categories.find((c) => c.name === editingCategory)?.subcategories || []).length > 0 && (
                            <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
                              {(categories.find((c) => c.name === editingCategory)?.subcategories || []).length}
                            </span>
                          )}
                        </h5>
                        <p className="mt-1 text-xs text-slate-500">Edit from here instead of the table list.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAddSubcategoryEditor(editingCategory)}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Add
                      </button>
                    </div>

                    {/* Scrollable subcategory list — max 260px tall */}
                    <div className="min-h-0 space-y-2 overflow-y-auto pr-1" style={{ maxHeight: '260px' }}>
                      {(categories.find((category) => category.name === editingCategory)?.subcategories || []).length > 0 ? (
                        (categories.find((category) => category.name === editingCategory)?.subcategories || []).map((subcategory) => (
                          <div
                            key={`${editingCategory}:${subcategory.name}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-800">{subcategory.name}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openSubcategoryEditor(editingCategory, subcategory)}
                              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                            >
                              Edit
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
                          No subcategories yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer — always visible at bottom */}
              <div className="flex shrink-0 gap-3 border-t border-slate-100 px-5 py-4">
                <button
                  onClick={() => handleUpdateCategory(editingCategory)}
                  className="flex-1 rounded-xl bg-green-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={closeEditor}
                  className="flex-1 rounded-xl bg-gray-400 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {addingSubcategoryFor && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">Add Subcategory</h4>
                  <p className="text-sm text-slate-500">Create a subcategory for {addingSubcategoryFor}.</p>
                </div>
                <button
                  type="button"
                  onClick={closeSubcategoryEditor}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <UiIcon name="close" className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  className="w-full rounded-xl border border-primary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
                  autoFocus
                  placeholder="Subcategory name"
                />
                <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleNewSubcategoryImageChange}
                    className="hidden"
                  />
                  Upload Subcategory Image
                </label>
                {newSubcategoryImage ? (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-white">
                      <img src={newSubcategoryImage} alt="New subcategory preview" className="h-full w-full object-cover" />
                    </div>
                    <span className="text-xs text-slate-500">Selected image preview</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">No image selected</div>
                )}
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={handleAddSubcategory}
                  className="flex-1 rounded-xl bg-green-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  Add Subcategory
                </button>
                <button
                  onClick={closeSubcategoryEditor}
                  className="flex-1 rounded-xl bg-gray-400 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {editingSubcategory && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">Edit Subcategory</h4>
                  <p className="text-sm text-slate-500">Update the selected subcategory for {editingSubcategory.parentName}.</p>
                </div>
                <button
                  type="button"
                  onClick={closeEditSubcategoryEditor}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <UiIcon name="close" className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={editSubcategoryName}
                  onChange={(e) => setEditSubcategoryName(e.target.value)}
                  className="w-full rounded-xl border border-primary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
                  autoFocus
                  placeholder="Subcategory name"
                />
                <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditSubcategoryImageChange}
                    className="hidden"
                  />
                  Upload Subcategory Image
                </label>
                {editSubcategoryImage ? (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-white">
                      <img src={editSubcategoryImage} alt={`${editSubcategoryName || 'Subcategory'} preview`} className="h-full w-full object-cover" />
                    </div>
                    <span className="text-xs text-slate-500">Selected image preview</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">No image selected</div>
                )}
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={handleUpdateSubcategory}
                  className="flex-1 rounded-xl bg-green-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleDeleteSubcategory}
                  className="flex-1 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={closeEditSubcategoryEditor}
                  className="flex-1 rounded-xl bg-gray-400 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CategoryManagement;
