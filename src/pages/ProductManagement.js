import React, { startTransition, useEffect, useState } from 'react';
import { useProducts } from '../context/ProductContext';
import UiIcon from '../components/UiIcon';
import TipTapEditor from '../components/TipTapEditor';
import { PRODUCT_TYPES, resolveProductType } from '../utils/productType';

const MIN_IMAGE_COUNT = 1;
const MAX_IMAGE_COUNT = 10;
const MIN_VIDEO_COUNT = 1;
const MAX_VIDEO_COUNT = 5;

const createEmptyVariantValue = () => ({
  value: '',
});

const createEmptyVariantGroup = () => ({
  attribute: '',
  values: [createEmptyVariantValue()],
  finalized: false,
});

const getVariantPricingKey = (attributes = {}) =>
  Object.entries(attributes)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([attribute, value]) => `${attribute}::${value}`)
    .join('||');

const getFinalizedVariantGroups = (variantGroups = []) =>
  (variantGroups || [])
    .map((group) => ({
      attribute: (group.attribute || '').trim(),
      values: (group.values || [])
        .map((entry) => (entry.value || '').trim())
        .filter(Boolean),
    }))
    .filter((group) => group.attribute && group.values.length > 0);

const buildVariantCombinations = (variantGroups = []) => {
  if (variantGroups.length === 0) return [];

  return variantGroups.reduce(
    (acc, group) =>
      acc.flatMap((existingRow) =>
        group.values.map((value) => ({
          ...existingRow,
          [group.attribute]: value,
        }))
      ),
    [{}]
  );
};

const buildVariantGroupsFromPricing = (variantPricing = []) => {
  const grouped = (variantPricing || []).reduce((acc, row) => {
    const attributes = row.attributes && typeof row.attributes === 'object' ? row.attributes : null;

    if (attributes && Object.keys(attributes).length > 0) {
      Object.entries(attributes).forEach(([attribute, value]) => {
        if (!attribute || !value) return;
        if (!acc[attribute]) acc[attribute] = new Set();
        acc[attribute].add(value);
      });
      return acc;
    }

    const attribute = (row.attribute || '').trim();
    const value = (row.value || '').trim();
    if (!attribute || !value) return acc;
    if (!acc[attribute]) acc[attribute] = new Set();
    acc[attribute].add(value);
    return acc;
  }, {});

  const groups = Object.entries(grouped).map(([attribute, values]) => ({
    attribute,
    values: [...values].map((value) => ({ value })),
    finalized: true,
  }));

  return groups.length > 0 ? groups : [createEmptyVariantGroup()];
};

const syncVariantPricingWithGroups = (variantPricing = [], variantGroups = [], basePrice = '') => {
  const finalizedGroups = getFinalizedVariantGroups(variantGroups);
  const combinations = buildVariantCombinations(finalizedGroups);
  const existingByKey = new Map(
    (variantPricing || [])
      .filter((row) => row.attributes && typeof row.attributes === 'object')
      .map((row) => [getVariantPricingKey(row.attributes), row])
  );

  return combinations.map((attributes) => {
    const existing = existingByKey.get(getVariantPricingKey(attributes));
    return {
      attribute: 'Combination',
      value: Object.values(attributes).join(' / '),
      attributes,
      price: existing?.price ?? basePrice ?? '',
      stock: existing?.stock ?? 0,
      sku: existing?.sku ?? '',
    };
  });
};

function ProductManagement() {
  const { products, categories, categoryNames, addProduct, updateProduct, deleteProduct } = useProducts();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showVariantGrid, setShowVariantGrid] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draggedImageIndex, setDraggedImageIndex] = useState(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [draggedVideoIndex, setDraggedVideoIndex] = useState(null);
  const [dragOverVideoIndex, setDragOverVideoIndex] = useState(null);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusPopup, setStatusPopup] = useState({ visible: false, title: '', message: '', id: null });
  const [isPreparingEdit, setIsPreparingEdit] = useState(false);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mainNote: '',
    keyFeatures: '',
    whatsIncluded: '',
    importantNotes: '',
    additionalInformation: '',
    price: '',
    salePrice: '',
    productType: PRODUCT_TYPES.VARIABLE,
    variantGroups: [createEmptyVariantGroup()],
    variantPricing: [],
    categories: [],
    subcategories: [],
    industries: [],
    imageUrls: Array(MIN_IMAGE_COUNT).fill(''),
    videoUrls: Array(MIN_VIDEO_COUNT).fill(''),
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const industriesOptions = [
    'Tech shops', 'DIY', 'Greengrocer', 'Pound shop', 'Pet shop', 'Vape shop',
    'Grocery store', 'Butcher', 'Organic shops', 'Pharmacy store', 'Restaurants', 'Bakery'
  ];
  const nextProductId = Math.max(...products.map((p) => Number(p.id) || 0), 0) + 1;
  const availableSubcategories = Array.from(
    new Map(
      categories
        .filter((category) => formData.categories.includes(category.name))
        .flatMap((category) => category.subcategories || [])
        .map((subcategory) => [subcategory.name, subcategory])
    ).values()
  );

  useEffect(() => {
    if (!statusPopup.visible) return undefined;
    const timer = window.setTimeout(() => {
      setStatusPopup((prev) => ({ ...prev, visible: false }));
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [statusPopup.visible, statusPopup.id]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      mainNote: '',
      keyFeatures: '',
      whatsIncluded: '',
      importantNotes: '',
      additionalInformation: '',
      price: '',
      salePrice: '',
      productType: PRODUCT_TYPES.VARIABLE,
      variantGroups: [createEmptyVariantGroup()],
      variantPricing: [],
      categories: [],
      subcategories: [],
      industries: [],
      imageUrls: Array(MIN_IMAGE_COUNT).fill(''),
      videoUrls: Array(MIN_VIDEO_COUNT).fill(''),
    });
    setEditingId(null);
    setShowVariantGrid(false);
    setError('');
    setSuccess('');
    setIsPreparingEdit(false);
    setStatusPopup((prev) => ({ ...prev, visible: false }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCategoryToggle = (cat) => {
    const nextCategories = formData.categories.includes(cat)
      ? formData.categories.filter(c => c !== cat)
      : [...formData.categories, cat];
    const allowedSubcategories = categories
      .filter((category) => nextCategories.includes(category.name))
      .flatMap((category) => (category.subcategories || []).map((subcategory) => subcategory.name));

    setFormData({
      ...formData,
      categories: nextCategories,
      subcategories: (formData.subcategories || []).filter((name) => allowedSubcategories.includes(name)),
    });
  };

  const handleSubcategoryToggle = (subcat) => {
    setFormData({
      ...formData,
      subcategories: formData.subcategories.includes(subcat)
        ? formData.subcategories.filter((s) => s !== subcat)
        : [...formData.subcategories, subcat],
    });
  };

  const handleIndustryToggle = (ind) => {
    setFormData({
      ...formData,
      industries: formData.industries.includes(ind)
        ? formData.industries.filter(i => i !== ind)
        : [...formData.industries, ind]
    });
  };

  const handleImageFileChange = (index, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload image files only');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setFormData((prev) => {
        const nextUrls = [...prev.imageUrls];
        nextUrls[index] = result;
        return { ...prev, imageUrls: nextUrls };
      });
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleImageClear = (index) => {
    setFormData((prev) => {
      const nextUrls = [...prev.imageUrls];
      nextUrls[index] = '';
      return { ...prev, imageUrls: nextUrls };
    });
  };

  const handleAddImageSlot = () => {
    setFormData((prev) => {
      if (prev.imageUrls.length >= MAX_IMAGE_COUNT) return prev;
      return { ...prev, imageUrls: [...prev.imageUrls, ''] };
    });
  };

  const handleRemoveLastImageSlot = () => {
    setFormData((prev) => {
      if (prev.imageUrls.length <= MIN_IMAGE_COUNT) return prev;
      return { ...prev, imageUrls: prev.imageUrls.slice(0, -1) };
    });
  };

  const handleImageDragStart = (event, index) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
    setIsDraggingImage(true);
    setDraggedImageIndex(index);
  };

  const handleVideoFileChange = (index, file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('Please upload video files only');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setFormData((prev) => {
        const nextUrls = [...prev.videoUrls];
        nextUrls[index] = result;
        return { ...prev, videoUrls: nextUrls };
      });
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleVideoClear = (index) => {
    setFormData((prev) => {
      const nextUrls = [...prev.videoUrls];
      nextUrls[index] = '';
      return { ...prev, videoUrls: nextUrls };
    });
  };

  const handleAddVideoSlot = () => {
    setFormData((prev) => {
      if (prev.videoUrls.length >= MAX_VIDEO_COUNT) return prev;
      return { ...prev, videoUrls: [...prev.videoUrls, ''] };
    });
  };

  const handleRemoveLastVideoSlot = () => {
    setFormData((prev) => {
      if (prev.videoUrls.length <= MIN_VIDEO_COUNT) return prev;
      return { ...prev, videoUrls: prev.videoUrls.slice(0, -1) };
    });
  };

  const handleVideoDragStart = (event, index) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
    setIsDraggingVideo(true);
    setDraggedVideoIndex(index);
  };

  const handleVideoDrop = (event, targetIndex) => {
    event.preventDefault();
    const sourceIndex = draggedVideoIndex;
    const inBounds = sourceIndex !== null && sourceIndex >= 0 && sourceIndex < formData.videoUrls.length;
    if (inBounds && sourceIndex !== targetIndex) {
      setFormData((prev) => {
        const nextUrls = [...prev.videoUrls];
        const [moved] = nextUrls.splice(sourceIndex, 1);
        nextUrls.splice(targetIndex, 0, moved);
        return {
          ...prev,
          videoUrls: nextUrls,
        };
      });
    }
    setDraggedVideoIndex(null);
    setDragOverVideoIndex(null);
    setIsDraggingVideo(false);
  };

  const handleImageDrop = (event, targetIndex) => {
    event.preventDefault();
    const sourceIndex = draggedImageIndex;
    const inBounds = sourceIndex !== null && sourceIndex >= 0 && sourceIndex < formData.imageUrls.length;
    if (inBounds && sourceIndex !== targetIndex) {
      setFormData((prev) => {
        const nextUrls = [...prev.imageUrls];
        const [moved] = nextUrls.splice(sourceIndex, 1);
        nextUrls.splice(targetIndex, 0, moved);
        return {
          ...prev,
          imageUrls: nextUrls,
        };
      });
    }
    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
    setIsDraggingImage(false);
  };

  const handleVariantGroupChange = (index, value) => {
    setFormData((prev) => {
      const next = [...prev.variantGroups];
      next[index] = { ...next[index], attribute: value, finalized: false };
      return { ...prev, variantGroups: next };
    });
  };

  const handleAddVariantGroup = () => {
    setFormData((prev) => ({
      ...prev,
      variantGroups: [...prev.variantGroups, createEmptyVariantGroup()],
    }));
  };

  const handleRemoveVariantGroup = (index) => {
    setFormData((prev) => {
      if (prev.variantGroups.length <= 1) return prev;
      return {
        ...prev,
        variantGroups: prev.variantGroups.filter((_, idx) => idx !== index),
      };
    });
  };

  const handleVariantValueChange = (groupIndex, valueIndex, field, value) => {
    setFormData((prev) => {
      const nextGroups = [...prev.variantGroups];
      const targetGroup = nextGroups[groupIndex];
      const nextValues = [...targetGroup.values];
      nextValues[valueIndex] = { ...nextValues[valueIndex], [field]: value };
      nextGroups[groupIndex] = { ...targetGroup, values: nextValues, finalized: false };
      return { ...prev, variantGroups: nextGroups };
    });
  };

  const handleAddVariantValue = (groupIndex) => {
    setFormData((prev) => {
      const nextGroups = [...prev.variantGroups];
      const targetGroup = nextGroups[groupIndex];
      nextGroups[groupIndex] = {
        ...targetGroup,
        values: [...targetGroup.values, createEmptyVariantValue()],
        finalized: false,
      };
      return { ...prev, variantGroups: nextGroups };
    });
  };

  const handleRemoveVariantValue = (groupIndex, valueIndex) => {
    setFormData((prev) => {
      const nextGroups = [...prev.variantGroups];
      const targetGroup = nextGroups[groupIndex];
      if (targetGroup.values.length <= 1) return prev;
      nextGroups[groupIndex] = {
        ...targetGroup,
        values: targetGroup.values.filter((_, idx) => idx !== valueIndex),
        finalized: false,
      };
      return { ...prev, variantGroups: nextGroups };
    });
  };

  const handleFinalizeVariantGroup = (groupIndex) => {
    setFormData((prev) => {
      const nextGroups = [...prev.variantGroups];
      const targetGroup = nextGroups[groupIndex];
      const cleanAttribute = (targetGroup.attribute || '').trim();
      const cleanValues = (targetGroup.values || []).map((entry) => (entry.value || '').trim());
      if (!cleanAttribute || cleanValues.some((val) => !val)) return prev;
      nextGroups[groupIndex] = {
        ...targetGroup,
        attribute: cleanAttribute,
        values: targetGroup.values.map((entry, idx) => ({ ...entry, value: cleanValues[idx] })),
        finalized: true,
      };
      return { ...prev, variantGroups: nextGroups };
    });
    setError('');
  };

  const handleOpenVariantGrid = () => {
    const finalizedGroups = getFinalizedVariantGroups(formData.variantGroups);
    const hasIncompleteGroup = finalizedGroups.length !== formData.variantGroups.length;

    if (hasIncompleteGroup || finalizedGroups.length === 0) {
      setError('Finish each attribute group before opening the variant grid');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      variantPricing: syncVariantPricingWithGroups(prev.variantPricing, prev.variantGroups, prev.price),
    }));
    setShowVariantGrid(true);
    setError('');
  };

  const handleVariantGridPriceChange = (rowIndex, value) => {
    setFormData((prev) => {
      const nextVariantPricing = [...prev.variantPricing];
      nextVariantPricing[rowIndex] = {
        ...nextVariantPricing[rowIndex],
        price: value,
      };
      return { ...prev, variantPricing: nextVariantPricing };
    });
  };

  const handleEditVariantGroup = (groupIndex) => {
    setFormData((prev) => {
      const nextGroups = [...prev.variantGroups];
      nextGroups[groupIndex] = { ...nextGroups[groupIndex], finalized: false };
      return { ...prev, variantGroups: nextGroups };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const requiresPrice = formData.productType !== PRODUCT_TYPES.CUSTOM;
    if (!formData.name.trim() || !formData.mainNote || (requiresPrice && !formData.price)) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.categories.length === 0) {
      setError('Please select at least one category');
      return;
    }

    const imageUrls = formData.imageUrls.map((url) => url.trim());
    const uploadedImageUrls = imageUrls.filter(Boolean);
    const cleanVariantOptions = formData.variantGroups
      .flatMap((group) => {
        const attribute = group.attribute.trim();
        return (group.values || []).map((entry) => ({
          attribute,
          value: (entry.value || '').trim(),
        }));
      })
      .filter((row) => row.attribute || row.value);

    const matrixVariantPricing = syncVariantPricingWithGroups(
      formData.variantPricing,
      formData.variantGroups,
      formData.price
    );

    if (formData.productType === PRODUCT_TYPES.VARIABLE) {
      if (cleanVariantOptions.length === 0) {
        setError('Add at least one attribute option for variable products');
        return;
      }
      const hasIncompleteRow = cleanVariantOptions.some((row) => !row.attribute || !row.value);
      if (hasIncompleteRow) {
        setError('Each attribute option needs attribute and value');
        return;
      }

      const hasMissingMatrixPrice = matrixVariantPricing.some((row) => row.price === '' || row.price === null || row.price === undefined);
      if (hasMissingMatrixPrice) {
        setError('Open the variant grid and add a price for each combination');
        return;
      }
    }

    const mainImage = uploadedImageUrls[0];
    const uploadedVideoUrls = formData.videoUrls.map((url) => url.trim()).filter(Boolean);
    const sizeValues = cleanVariantOptions
      .filter((row) => row.attribute.toLowerCase() === 'size')
      .map((row) => row.value);
    const colorValues = cleanVariantOptions
      .filter((row) => ['color', 'colour'].includes(row.attribute.toLowerCase()))
      .map((row) => row.value);
    const uniqueSizes = [...new Set(sizeValues)];
    const uniqueColors = [...new Set(colorValues)];

    const payload = {
      name: formData.name,
      description: formData.description,
      mainNote: formData.mainNote,
      keyFeatures: formData.keyFeatures,
      whatsIncluded: formData.whatsIncluded,
      importantNotes: formData.importantNotes,
      additionalInformation: formData.additionalInformation,
      price: formData.productType === PRODUCT_TYPES.CUSTOM ? '' : formData.price,
      salePrice: formData.productType === PRODUCT_TYPES.CUSTOM ? '' : formData.salePrice,
      productType: formData.productType,
      variantPricing: formData.productType === PRODUCT_TYPES.VARIABLE ? matrixVariantPricing : [],
      minPrice: undefined,
      maxPrice: undefined,
      sizes: uniqueSizes,
      colors: uniqueColors,
      categories: formData.categories,
      subcategories: formData.subcategories,
      industries: formData.industries,
      image: mainImage,
      galleryImages: uploadedImageUrls.slice(1),
      imageCount: uploadedImageUrls.length,
      video: uploadedVideoUrls[0] || '',
      galleryVideos: uploadedVideoUrls.slice(1),
      videoCount: uploadedVideoUrls.length,
    };

    try {
      setIsSaving(true);
      if (editingId) {
        await updateProduct(editingId, payload);
        setSuccess('Product updated successfully!');
        setStatusPopup({
          visible: true,
          title: 'Product updated',
          message: `${formData.name || 'Product'} was updated successfully.`,
          id: Date.now(),
        });
      } else {
        await addProduct(payload);
        setSuccess('Product added successfully!');
        setStatusPopup({
          visible: true,
          title: 'Product added',
          message: `${formData.name || 'Product'} was saved successfully.`,
          id: Date.now(),
        });
      }

      resetForm();
      setShowAddForm(false);
    } catch (err) {
      setError(err.message || 'Unable to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (product) => {
    setError('');
    setSuccess('');
    setStatusPopup((prev) => ({ ...prev, visible: false }));
    setIsPreparingEdit(true);
    setEditingId(product.id);
    setShowVariantGrid(false);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const imageUrls = [product.image, ...(product.galleryImages || [])].filter(Boolean).slice(0, MAX_IMAGE_COUNT);
    const safeUrls = [...imageUrls];
    while (safeUrls.length < MIN_IMAGE_COUNT) safeUrls.push('');
    const videoUrls = [product.video, ...(product.galleryVideos || [])].filter(Boolean).slice(0, MAX_VIDEO_COUNT);
    const safeVideoUrls = [...videoUrls];
    while (safeVideoUrls.length < MIN_VIDEO_COUNT) safeVideoUrls.push('');
    window.setTimeout(() => {
      startTransition(() => {
        setFormData({
          name: product.name || '',
          description: product.description || '',
          mainNote: product.mainNote || '',
          keyFeatures: product.keyFeatures || '',
          whatsIncluded: product.whatsIncluded || '',
          importantNotes: product.importantNotes || '',
          additionalInformation: product.additionalInformation || '',
          price: product.price || '',
          salePrice: product.salePrice || '',
          productType: resolveProductType(product),
          variantGroups: Array.isArray(product.variantPricing) && product.variantPricing.length > 0
            ? buildVariantGroupsFromPricing(product.variantPricing)
            : [createEmptyVariantGroup()],
          variantPricing: Array.isArray(product.variantPricing) ? product.variantPricing : [],
          categories: product.categories || [],
          subcategories: product.subcategories || [],
          industries: product.industries || [],
          imageUrls: safeUrls,
          videoUrls: safeVideoUrls,
        });
        setIsPreparingEdit(false);
      });
    }, 0);
  };

  const handleDelete = async () => {
    if (!pendingDeleteProduct) return;

    try {
      await deleteProduct(pendingDeleteProduct.id);
      setSuccess('Product deleted successfully!');
      setStatusPopup({
        visible: true,
        title: 'Product deleted',
        message: `${pendingDeleteProduct.name || 'Product'} was deleted successfully.`,
        id: Date.now(),
      });
    } catch (err) {
      setError(err.message || 'Unable to delete product');
    } finally {
      setPendingDeleteProduct(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    if (q && !p.name.toLowerCase().includes(q) && !String(p.id).includes(q)) return false;
    if (typeFilter !== 'all' && resolveProductType(p) !== typeFilter) return false;
    if (statusFilter !== 'all') {
      const avail = Math.max((p.inventory?.onHand ?? 0) - (p.inventory?.reserved ?? 0), 0);
      if (statusFilter === 'out' && avail > 0) return false;
      if (statusFilter === 'low' && !(avail > 0 && avail <= (p.inventory?.reorderLevel ?? 0))) return false;
      if (statusFilter === 'healthy' && avail <= (p.inventory?.reorderLevel ?? 0)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {statusPopup.visible && (
        <div className="fixed right-4 top-20 z-[90] w-[min(92vw,420px)]">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-xl backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-emerald-800">{statusPopup.title}</p>
                <p className="mt-1 text-sm text-emerald-700">{statusPopup.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setStatusPopup((prev) => ({ ...prev, visible: false }))}
                className="rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingDeleteProduct && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600">
                <UiIcon name="trash" className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Delete Product?</h4>
                <p className="mt-1 text-sm text-slate-600">
                  Are you sure you want to delete <span className="font-semibold text-slate-900">{pendingDeleteProduct.name}</span>?
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteProduct(null)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-2xl font-bold text-primary">
          <UiIcon name="box" className="h-6 w-6" />
          Product Management
        </h3>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddForm(false);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              !showAddForm ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Products
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              showAddForm ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Add Product
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-md p-8">
          <h4 className="text-2xl font-bold text-gray-800 mb-6">
            {editingId ? 'Edit Product' : 'Add New Product'}
          </h4>

          {error && (
            <div className="bg-blue-50 border-2 border-blue-500 text-blue-700 p-4 rounded-lg mb-6 inline-flex items-center gap-2">
              <UiIcon name="alert" className="h-5 w-5" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-2 border-green-500 text-green-700 p-4 rounded-lg mb-6 inline-flex items-center gap-2">
              <UiIcon name="check" className="h-5 w-5" />
              {success}
            </div>
          )}

          {isPreparingEdit && (
            <div className="bg-slate-50 border-2 border-slate-300 text-slate-700 p-4 rounded-lg mb-6 inline-flex items-center gap-2">
              <UiIcon name="loading" className="h-5 w-5" />
              Preparing product editor...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Product ID</label>
                <input
                  type="text"
                  value={editingId || nextProductId}
                  readOnly
                  className="w-full border-2 border-gray-200 bg-gray-100 rounded-lg px-4 py-3 text-gray-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Product Type *</label>
                <div className="relative">
                  <select
                    name="productType"
                    value={formData.productType}
                    onChange={handleInputChange}
                    className="w-full appearance-none rounded-xl border-2 border-red-200 bg-white px-4 py-3 pr-10 font-semibold text-red-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-red-100"
                    required
                  >
                    <option value={PRODUCT_TYPES.SIMPLE}>Simple (Direct Buy)</option>
                    <option value={PRODUCT_TYPES.VARIABLE}>Variable (Select Options)</option>
                    <option value={PRODUCT_TYPES.CUSTOM}>Custom (Request Quote)</option>
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-red-500">
                    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
                      <path d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Price £ {formData.productType === PRODUCT_TYPES.CUSTOM ? '(optional)' : '*'}
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                  required={formData.productType !== PRODUCT_TYPES.CUSTOM}
                />
              </div>
              {formData.productType !== PRODUCT_TYPES.CUSTOM && (
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Sale Price £ (optional)</label>
                  <input
                    type="number"
                    name="salePrice"
                    value={formData.salePrice}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                  />
                </div>
              )}
            </div>

            {formData.productType === PRODUCT_TYPES.VARIABLE && (
              <div className="rounded-xl border-2 border-gray-200 p-4">
                <div className="mb-3">
                  <h5 className="text-lg font-bold text-gray-800">Attribute Groups</h5>
                </div>
                <p className="mb-3 text-sm text-gray-600">
                  Create one attribute at a time (for example: Color), then add all values (Red, Blue, Green). Repeat for Size, Material, etc.
                </p>
                <div className="space-y-3">
                  {formData.variantGroups.map((group, groupIndex) => (
                    <div key={`variant-group-${groupIndex}`} className="rounded-lg border border-gray-200 p-3">
                      {group.finalized ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.08em] text-red-700">Attribute #{groupIndex + 1}</p>
                              <h6 className="mt-1 text-base font-bold text-slate-900">{group.attribute}</h6>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {group.values.map((entry, valueIndex) => (
                                  <span key={`variant-tag-${groupIndex}-${valueIndex}`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-red-200">
                                    {entry.value}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditVariantGroup(groupIndex)}
                                className="rounded bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              {formData.variantGroups.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariantGroup(groupIndex)}
                                  className="rounded bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-700">Attribute #{groupIndex + 1}</p>
                            {formData.variantGroups.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveVariantGroup(groupIndex)}
                                className="rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200"
                              >
                                Remove Attribute
                              </button>
                            )}
                          </div>
                          <div className="mb-3">
                            <input
                              type="text"
                              value={group.attribute}
                              onChange={(e) => handleVariantGroupChange(groupIndex, e.target.value)}
                              placeholder="Attribute name (e.g. Color)"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                            />
                          </div>

                          <div className="space-y-2">
                            {group.values.map((entry, valueIndex) => (
                              <div key={`variant-value-${groupIndex}-${valueIndex}`} className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 p-2 md:grid-cols-[1fr_auto]">
                                <input
                                  type="text"
                                  value={entry.value}
                                  onChange={(e) => handleVariantValueChange(groupIndex, valueIndex, 'value', e.target.value)}
                                  placeholder={`Value #${valueIndex + 1} (e.g. Red)`}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                                />
                                {group.values.length > 1 ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVariantValue(groupIndex, valueIndex)}
                                    className="rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200"
                                  >
                                    Remove
                                  </button>
                                ) : (
                                  <span />
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleAddVariantValue(groupIndex)}
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
                            >
                              + Add Value
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const cleanAttribute = (group.attribute || '').trim();
                                const hasInvalidValue = (group.values || []).some((entry) => !(entry.value || '').trim());
                                if (!cleanAttribute || hasInvalidValue) {
                                  setError('Before Done: add attribute name and fill all values');
                                  return;
                                }
                                handleFinalizeVariantGroup(groupIndex);
                              }}
                              className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-red-800"
                            >
                              Done
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleAddVariantGroup}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800"
                    >
                      + Add Attribute
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenVariantGrid}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Open Variant Grid
                    </button>
                    {formData.variantPricing.length > 0 && (
                      <p className="text-sm text-slate-500">
                        {formData.variantPricing.length} combination{formData.variantPricing.length === 1 ? '' : 's'} ready
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Main Note *</label>
              <TipTapEditor
                value={formData.mainNote}
                onChange={(val) => setFormData((prev) => ({ ...prev, mainNote: val }))}
                placeholder="Enter the main note for this product..."
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Description</label>
              <TipTapEditor
                value={formData.description}
                onChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
                placeholder="Enter a product description..."
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Key Features</label>
              <TipTapEditor
                value={formData.keyFeatures}
                onChange={(val) => setFormData((prev) => ({ ...prev, keyFeatures: val }))}
                placeholder="List the key features of this product..."
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">What's Included</label>
              <TipTapEditor
                value={formData.whatsIncluded}
                onChange={(val) => setFormData((prev) => ({ ...prev, whatsIncluded: val }))}
                placeholder="Describe what's included with this product..."
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Important Notes</label>
              <TipTapEditor
                value={formData.importantNotes}
                onChange={(val) => setFormData((prev) => ({ ...prev, importantNotes: val }))}
                placeholder="Any important notes or warnings..."
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Additional Information</label>
              <TipTapEditor
                value={formData.additionalInformation}
                onChange={(val) => setFormData((prev) => ({ ...prev, additionalInformation: val }))}
                placeholder="Any additional information about this product..."
              />
            </div>

            <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/60 p-4 sm:p-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-gray-700 font-semibold">Product Images (default 5, max 10)</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddImageSlot}
                    disabled={formData.imageUrls.length >= MAX_IMAGE_COUNT}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    + Add Image
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveLastImageSlot}
                    disabled={formData.imageUrls.length <= MIN_IMAGE_COUNT}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove Last
                  </button>
                </div>
              </div>
              <ul className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
                {formData.imageUrls.map((url, idx) => (
                  <li
                    key={`image-slot-${idx}`}
                    draggable
                    onDragStart={(e) => handleImageDragStart(e, idx)}
                    onDragEnter={() => setDragOverImageIndex(idx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => handleImageDrop(e, idx)}
                    onDragEnd={() => {
                      setDraggedImageIndex(null);
                      setDragOverImageIndex(null);
                      setIsDraggingImage(false);
                    }}
                    className={`group relative flex h-[98px] w-[78px] shrink-0 flex-col gap-0.5 rounded-md border px-1.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                      draggedImageIndex === idx
                        ? 'scale-[0.99] cursor-grabbing border-red-400 bg-red-50 shadow-lg ring-2 ring-red-200 opacity-35'
                        : dragOverImageIndex === idx
                          ? 'cursor-grab border-red-400 bg-red-50/80 shadow-md ring-2 ring-red-200'
                          : 'cursor-grab border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                      {url && (
                        <button
                          type="button"
                          onClick={() => handleImageClear(idx)}
                          aria-label={`Remove image ${idx + 1}`}
                          className="absolute right-1.5 top-1 text-[12px] font-bold leading-none text-slate-500 transition hover:text-red-700"
                        >
                          X
                        </button>
                      )}
                      <span className="inline-flex w-fit cursor-grab items-center text-slate-400 active:cursor-grabbing">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <circle cx="9" cy="12" r="1" />
                          <circle cx="9" cy="5" r="1" />
                          <circle cx="9" cy="19" r="1" />
                          <circle cx="15" cy="12" r="1" />
                          <circle cx="15" cy="5" r="1" />
                          <circle cx="15" cy="19" r="1" />
                        </svg>
                      </span>

                      <label
                        htmlFor={`image-upload-${idx}`}
                        className={`mx-auto shrink-0 ${isDraggingImage ? 'pointer-events-none' : 'cursor-pointer'}`}
                      >
                        {url ? (
                          <img
                            src={url}
                            alt={`Product slot ${idx + 1}`}
                            className="h-11 w-11 rounded object-cover ring-1 ring-slate-200 transition group-hover:ring-red-200"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded border-2 border-dashed border-slate-300 bg-slate-50 text-[10px] font-semibold text-slate-500 transition group-hover:border-red-300 group-hover:bg-red-50/40">
                            +
                          </div>
                        )}
                      </label>
                      <input
                        id={`image-upload-${idx}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageFileChange(idx, e.target.files?.[0])}
                      />
                      <div className="min-w-0 flex-1 text-center">
                        <p className="truncate text-[10px] font-semibold text-slate-700">
                          {idx === 0 ? `Image ${idx + 1} (Main)` : `Image ${idx + 1}`}
                        </p>
                        <p className="text-[9px] text-slate-500">{url ? 'Uploaded' : 'Upload'}</p>
                      </div>
                      <div className="mt-auto" />
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">Upload as many images as you want (up to 10). Drag to reorder; the first image is always the main image.</p>
            </div>

            <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/60 p-4 sm:p-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-gray-700 font-semibold">Product Videos (optional)</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddVideoSlot}
                    disabled={formData.videoUrls.length >= MAX_VIDEO_COUNT}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    + Add Video
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveLastVideoSlot}
                    disabled={formData.videoUrls.length <= MIN_VIDEO_COUNT}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove Last
                  </button>
                </div>
              </div>
              <ul className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
                {formData.videoUrls.map((url, idx) => (
                  <li
                    key={`video-slot-${idx}`}
                    draggable
                    onDragStart={(e) => handleVideoDragStart(e, idx)}
                    onDragEnter={() => setDragOverVideoIndex(idx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => handleVideoDrop(e, idx)}
                    onDragEnd={() => {
                      setDraggedVideoIndex(null);
                      setDragOverVideoIndex(null);
                      setIsDraggingVideo(false);
                    }}
                    className={`group relative flex h-[98px] w-[78px] shrink-0 flex-col gap-0.5 rounded-md border px-1.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                      draggedVideoIndex === idx
                        ? 'scale-[0.99] cursor-grabbing border-red-400 bg-red-50 shadow-lg ring-2 ring-red-200 opacity-35'
                        : dragOverVideoIndex === idx
                          ? 'cursor-grab border-red-400 bg-red-50/80 shadow-md ring-2 ring-red-200'
                          : 'cursor-grab border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {url && (
                      <button
                        type="button"
                        onClick={() => handleVideoClear(idx)}
                        aria-label={`Remove video ${idx + 1}`}
                        className="absolute right-1.5 top-1 text-[12px] font-bold leading-none text-slate-500 transition hover:text-red-700"
                      >
                        X
                      </button>
                    )}
                    <span className="inline-flex w-fit cursor-grab items-center text-slate-400 active:cursor-grabbing">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="9" cy="12" r="1" />
                        <circle cx="9" cy="5" r="1" />
                        <circle cx="9" cy="19" r="1" />
                        <circle cx="15" cy="12" r="1" />
                        <circle cx="15" cy="5" r="1" />
                        <circle cx="15" cy="19" r="1" />
                      </svg>
                    </span>

                    <label
                      htmlFor={`video-upload-${idx}`}
                      className={`mx-auto shrink-0 ${isDraggingVideo ? 'pointer-events-none' : 'cursor-pointer'}`}
                    >
                      {url ? (
                        <video
                          src={url}
                          className="h-11 w-11 rounded object-cover ring-1 ring-slate-200"
                          muted
                          playsInline
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded border-2 border-dashed border-slate-300 bg-slate-50 text-[10px] font-semibold text-slate-500 transition group-hover:border-red-300 group-hover:bg-red-50/40">
                          +
                        </div>
                      )}
                    </label>
                    <input
                      id={`video-upload-${idx}`}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => handleVideoFileChange(idx, e.target.files?.[0])}
                    />
                    <div className="min-w-0 flex-1 text-center">
                      <p className="truncate text-[10px] font-semibold text-slate-700">
                        {idx === 0 ? `Video ${idx + 1} (Main)` : `Video ${idx + 1}`}
                      </p>
                      <p className="text-[9px] text-slate-500">{url ? 'Uploaded' : 'Upload'}</p>
                    </div>
                    <div className="mt-auto" />
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">Add optional product videos and drag to reorder; first video is main.</p>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-gray-700 font-semibold mb-3">Select Categories *</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categoryNames.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.categories.includes(cat)}
                      onChange={() => handleCategoryToggle(cat)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-gray-700">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Subcategories */}
            {availableSubcategories.length > 0 && (
              <div>
                <label className="block text-gray-700 font-semibold mb-3">Select Subcategories (optional)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableSubcategories.map((subcategory) => (
                    <label key={subcategory.name} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.subcategories.includes(subcategory.name)}
                        onChange={() => handleSubcategoryToggle(subcategory.name)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-gray-700">{subcategory.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Industries */}
            <div>
              <label className="block text-gray-700 font-semibold mb-3">Select Industries (optional)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {industriesOptions.map((ind) => (
                  <label key={ind} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.industries.includes(ind)}
                      onChange={() => handleIndustryToggle(ind)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-gray-700 text-sm">{ind}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4 border-t-2 border-gray-200">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 rounded-lg bg-primary py-3 font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <span className="inline-flex items-center gap-2">
                  <UiIcon name={editingId ? 'save' : 'check'} className="h-4 w-4" />
                  {isSaving ? 'Saving...' : editingId ? 'Update Product' : 'Add Product'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowAddForm(false);
                }}
                className="flex-1 bg-gray-400 text-white py-3 rounded-lg font-bold hover:bg-gray-500 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showAddForm && showVariantGrid && formData.productType === PRODUCT_TYPES.VARIABLE && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h4 className="text-xl font-bold text-slate-900">Variant Price Grid</h4>
                <p className="text-sm text-slate-500">
                  One row per attribute combination. Add the selling price for each combination.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVariantGrid(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto px-6 py-5">
              <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-xl border border-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    {getFinalizedVariantGroups(formData.variantGroups).map((group) => (
                      <th key={group.attribute} className="border-b border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-700">
                        {group.attribute}
                      </th>
                    ))}
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-700">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {formData.variantPricing.map((row, rowIndex) => (
                    <tr key={getVariantPricingKey(row.attributes || {}) || `variant-row-${rowIndex}`} className="bg-white">
                      {getFinalizedVariantGroups(formData.variantGroups).map((group) => (
                        <td key={`${rowIndex}-${group.attribute}`} className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                          {row.attributes?.[group.attribute] || '-'}
                        </td>
                      ))}
                      <td className="border-b border-slate-100 px-4 py-3">
                        <input
                          type="number"
                          value={row.price}
                          onChange={(e) => handleVariantGridPriceChange(rowIndex, e.target.value)}
                          placeholder={formData.price ? `Base ${formData.price}` : '0.00'}
                          step="0.01"
                          className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowVariantGrid(false)}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products List */}
      {!showAddForm && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-xl font-bold text-gray-800">
              All Products
              <span className="ml-2 text-base font-normal text-gray-500">
                ({filteredProducts.length}{filteredProducts.length !== products.length ? ` of ${products.length}` : ''})
              </span>
            </h4>
          </div>

          {/* Search & Filters */}
          <div className="mb-5 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <UiIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search by name or ID…"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="simple">Simple</option>
              <option value="variable">Variable</option>
              <option value="custom">Custom</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
            {(productSearch || typeFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => { setProductSearch(''); setTypeFilter('all'); setStatusFilter('all'); }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Clear
              </button>
            )}
          </div>

          <div>
            <table className="w-full table-fixed">
              <thead className="bg-gray-100">
                <tr>
                  <th className="w-[5%] px-3 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                  <th className="w-[16%] px-3 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="w-[9%] px-3 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                  <th className="w-[10%] px-3 py-3 text-left text-sm font-semibold text-gray-700">Price</th>
                  <th className="w-[6%] px-3 py-3 text-left text-sm font-semibold text-gray-700">Images</th>
                  <th className="w-[9%] px-3 py-3 text-left text-sm font-semibold text-gray-700">Stock</th>
                  <th className="w-[13%] px-3 py-3 text-left text-sm font-semibold text-gray-700">Categories</th>
                  <th className="w-[13%] px-3 py-3 text-left text-sm font-semibold text-gray-700">Subcategories</th>
                  <th className="w-[9%] px-3 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="w-[10%] px-3 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-500">
                      {productSearch || typeFilter !== 'all' || statusFilter !== 'all'
                        ? 'No products match your filters.'
                        : 'No products yet.'}
                    </td>
                  </tr>
                )}
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-4 align-top text-sm font-semibold text-gray-800">#{product.id}</td>
                    <td className="px-3 py-4 align-top text-sm font-semibold text-gray-800 break-words">{product.name}</td>
                    <td className="px-3 py-4 align-top text-sm font-semibold text-gray-700 capitalize break-words">
                      {resolveProductType(product)}
                    </td>
                    <td className="px-3 py-4 align-top">
                      {resolveProductType(product) === PRODUCT_TYPES.CUSTOM ? (
                        <span className="text-sm font-bold text-slate-600">Custom Pricing</span>
                      ) : (
                        <div className="break-words">
                          <span className="text-sm font-bold text-accent">£{product.price}</span>
                          {product.salePrice && (
                            <span className="ml-2 text-xs text-gray-600 line-through">£{product.salePrice}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4 align-top text-sm font-semibold text-gray-800">
                      {1 + (product.galleryImages?.length || 0)}
                    </td>
                    <td className="px-3 py-4 align-top">
                      <p className="text-sm font-bold text-gray-800">{product.inventory?.onHand ?? 0}</p>
                      <p className="text-xs text-gray-500">
                        Avl: {Math.max((product.inventory?.onHand ?? 0) - (product.inventory?.reserved ?? 0), 0)}
                      </p>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="flex flex-wrap gap-1">
                        {product.categories.slice(0, 2).map((cat) => (
                          <span key={cat} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {cat}
                          </span>
                        ))}
                        {product.categories.length > 2 && (
                          <span className="text-gray-600 text-xs">+{product.categories.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="flex flex-wrap gap-1">
                        {(product.subcategories || []).length > 0 ? (
                          <>
                            {(product.subcategories || []).slice(0, 2).map((subcategory) => (
                              <span key={subcategory} className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full">
                                {subcategory}
                              </span>
                            ))}
                            {(product.subcategories || []).length > 2 && (
                              <span className="text-gray-600 text-xs">+{product.subcategories.length - 2}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">No subcategory</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 align-top">
                      {Math.max((product.inventory?.onHand ?? 0) - (product.inventory?.reserved ?? 0), 0) <= 0 ? (
                        <span className="inline-flex px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          Out of Stock
                        </span>
                      ) : Math.max((product.inventory?.onHand ?? 0) - (product.inventory?.reserved ?? 0), 0) <= (product.inventory?.reorderLevel ?? 0) ? (
                        <span className="inline-flex px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          Healthy
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="flex flex-col items-start gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                      >
                        <span className="inline-flex items-center gap-1">
                          <UiIcon name="edit" className="h-4 w-4" />
                          Edit
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteProduct({ id: product.id, name: product.name })}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                      >
                        <span className="inline-flex items-center gap-1">
                          <UiIcon name="trash" className="h-4 w-4" />
                          Delete
                        </span>
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
    </div>
  );
}

export default ProductManagement;
