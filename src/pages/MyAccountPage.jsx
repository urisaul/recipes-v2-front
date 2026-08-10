import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import RecipeListItem from '../components/RecipeListItem';
import { FAVORITES_OBJECT_ID, PORTAL_ID, RECIPES_OBJECT_ID } from '../lib/constants';
import { getApiClient } from '../lib/portalApi';

const emptyRecipeForm = {
  recipeTitle: '',
  recipeDesc: '',
  recipeCategory: '',
  recipeDifficulty: 'easy',
  prepTime: '',
  cookTime: '',
  servings: '',
  calories: '',
  fat: '',
  protein: '',
  carbs: '',
  recipePublic: false,
};

export default function MyAccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [sort, setSort] = useState('newest');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [ingredients, setIngredients] = useState(['', '']);
  const [steps, setSteps] = useState(['']);
  const [draggedIngredientIndex, setDraggedIngredientIndex] = useState(null);
  const [draggedStepIndex, setDraggedStepIndex] = useState(null);
  const [form, setForm] = useState(emptyRecipeForm);
  const [isSaving, setIsSaving] = useState(false);
  const [visibilityLoadingId, setVisibilityLoadingId] = useState('');
  const [deleteLoadingId, setDeleteLoadingId] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Bulk import states
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkImportStep, setBulkImportStep] = useState(1); // 1=prompt, 2=paste, 3=preview, 4=progress
  const [bulkImportPaste, setBulkImportPaste] = useState('');
  const [bulkImportRecipes, setBulkImportRecipes] = useState([]);
  const [bulkImportProgress, setBulkImportProgress] = useState({ current: 0, total: 0, status: '' });
  const [bulkImportCreating, setBulkImportCreating] = useState(false);
  const [bulkImportError, setBulkImportError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const api = await getApiClient();
        const currentUser = await api.auth.verifyToken();
        const displayName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email || '';
        setUser({ displayName, shortName: currentUser.firstName || displayName });
        await loadRecipes(api);
        setLoading(false);
      } catch {
        navigate('/login');
      }
    })();
  }, [navigate]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return recipes;
    if (activeTab === 'favorites') {
      const favoriteSet = new Set(favoriteRecipeIds);
      return recipes.filter((recipe) => favoriteSet.has(String(recipe?._id || '')));
    }
    return recipes.filter((r) => (r.data?.privacy_setting === 'public' ? 'public' : 'private') === activeTab);
  }, [activeTab, favoriteRecipeIds, recipes]);

  function toRecipeIdList(records) {
    const idSet = new Set();
    const maybeIdKeys = ['_id', 'id', 'recipeId', 'recipe_id', 'savedRecipeId', 'favoriteRecipeId', 'favouriteRecipeId'];
    const candidateKeys = [
      'recipes',
      'savedRecipeId',
      'recipeId',
      'recipe_id',
      'favoriteRecipeId',
      'favouriteRecipeId',
      'recipeIds',
      'savedRecipeIds',
    ];

    function addId(value) {
      if (value === null || value === undefined) return;

      if (Array.isArray(value)) {
        value.forEach(addId);
        return;
      }

      if (typeof value === 'object') {
        maybeIdKeys.forEach((key) => {
          if (key in value) addId(value[key]);
        });
        return;
      }

      // Some backends store IDs as comma/newline-separated strings.
      String(value)
        .split(/[\n,]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((id) => idSet.add(id));
    }

    records.forEach((record) => {
      const data = record?.data || record || {};
      candidateKeys.forEach((key) => {
        addId(data[key]);
      });
    });

    return Array.from(idSet);
  }

  async function loadRecipes(apiClient, sortValue) {
    const api = apiClient || (await getApiClient());
    const currentSort = sortValue || sort;
    const sortParam = currentSort === 'newest'
      ? [{ field: 'creation_date', order: 'desc' }]
      : currentSort === 'oldest'
        ? [{ field: 'creation_date', order: 'asc' }]
        : currentSort === 'name-asc'
          ? [{ field: 'recipe_name', order: 'asc' }]
          : [{ field: 'recipe_name', order: 'desc' }];
    const [recipesData, favoritesData] = await Promise.all([
      api.auth.getData({ portalId: PORTAL_ID, objectId: RECIPES_OBJECT_ID, page: 1, limit: 100, sort: sortParam }),
      api.auth.getData({ portalId: PORTAL_ID, objectId: FAVORITES_OBJECT_ID, page: 1, limit: 500 }),
    ]);
    const records = Array.isArray(recipesData) ? recipesData : recipesData?.data || recipesData?.records || [];
    const favoriteRecords = Array.isArray(favoritesData) ? favoritesData : favoritesData?.data || favoritesData?.records || [];
    setRecipes(records);
    setFavoriteRecipeIds(toRecipeIdList(favoriteRecords));
  }

  function openNewModal() {
    setEditId('');
    setForm(emptyRecipeForm);
    setIngredients(['', '']);
    setSteps(['']);
    setDraggedIngredientIndex(null);
    setDraggedStepIndex(null);
    setImageFile(null);
    setPreviewUrl('');
    setModalOpen(true);
  }

  function openEditModal(recipe) {
    const d = recipe.data || {};
    setEditId(recipe._id);
    setForm({
      recipeTitle: d.recipe_name || '',
      recipeDesc: d.description || '',
      recipeCategory: d.category || '',
      recipeDifficulty: d.difficulty || 'easy',
      prepTime: d.prep_time_minutes || '',
      cookTime: d.cook_time_minutes || '',
      servings: d.servings || '',
      calories: d.calories || '',
      fat: d.fat || '',
      protein: d.protein || '',
      carbs: d.carbs || '',
      recipePublic: d.privacy_setting === 'public',
    });
    const ing = Array.isArray(d.ingredients) ? d.ingredients : d.ingredients ? String(d.ingredients).split('\n').filter(Boolean) : [''];
    const stp = Array.isArray(d.instructions) ? d.instructions : d.instructions ? String(d.instructions).split('\n').filter(Boolean) : [''];
    setIngredients(ing.length ? ing : ['']);
    setSteps(stp.length ? stp : ['']);
    setDraggedIngredientIndex(null);
    setDraggedStepIndex(null);
    setImageFile(null);
    setPreviewUrl('');
    setModalOpen(true);
  }

  function reorderItems(items, fromIndex, toIndex) {
    if (fromIndex === null || toIndex === null || fromIndex === toIndex) return items;
    const nextItems = [...items];
    const [moved] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, moved);
    return nextItems;
  }

  function onIngredientDrop(targetIndex) {
    setIngredients((prev) => reorderItems(prev, draggedIngredientIndex, targetIndex));
    setDraggedIngredientIndex(null);
  }

  function onStepDrop(targetIndex) {
    setSteps((prev) => reorderItems(prev, draggedStepIndex, targetIndex));
    setDraggedStepIndex(null);
  }

  async function onSubmitRecipe(e) {
    e.preventDefault();
    if (isSaving) return;

    if (!form.recipeTitle.trim()) {
      alert('Please enter a recipe title.');
      return;
    }

    const recipeFields = {
      recipe_name: form.recipeTitle.trim(),
      description: form.recipeDesc.trim(),
      category: form.recipeCategory,
      difficulty: form.recipeDifficulty,
      prep_time_minutes: form.prepTime,
      cook_time_minutes: form.cookTime,
      servings: form.servings,
      calories: form.calories,
      fat: form.fat,
      protein: form.protein,
      carbs: form.carbs,
      ingredients: ingredients.map((i) => i.trim()).filter(Boolean).join('\n'),
      instructions: steps.map((s) => s.trim()).filter(Boolean).join('\n'),
      privacy_setting: form.recipePublic ? 'public' : 'private',
    };

    const fd = new FormData();
    fd.append('portalId', PORTAL_ID);
    Object.entries(recipeFields).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        fd.append(`data[${key}]`, value);
      }
    });
    if (imageFile) fd.append('image', imageFile);

    try {
      setIsSaving(true);
      const api = await getApiClient();
      if (editId) {
        await api.auth.updateData(editId, fd);
      } else {
        fd.append('objectId', RECIPES_OBJECT_ID);
        await api.auth.createData(fd);
      }
      await loadRecipes(api);
      setModalOpen(false);
    } catch (err) {
      alert(err?.data?.message || 'Failed to save recipe.');
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleVisibility(recipe) {
    if (visibilityLoadingId === recipe._id) return;

    const isPublic = recipe.data?.privacy_setting === 'public';
    try {
      setVisibilityLoadingId(recipe._id);
      const api = await getApiClient();
      await api.auth.updateData(recipe._id, { portalId: PORTAL_ID, data: { privacy_setting: isPublic ? 'private' : 'public' } });
      await loadRecipes(api);
    } catch {}
    finally {
      setVisibilityLoadingId('');
    }
  }

  async function deleteRecipe(recipe) {
    if (deleteLoadingId === recipe._id) return;
    if (!window.confirm('Delete this recipe? This cannot be undone.')) return;
    try {
      setDeleteLoadingId(recipe._id);
      const api = await getApiClient();
      await api.auth.deleteData(recipe._id, { portalId: PORTAL_ID });
      await loadRecipes(api);
    } catch {}
    finally {
      setDeleteLoadingId('');
    }
  }

  function openBulkImportModal() {
    setBulkImportOpen(true);
    setBulkImportStep(1);
    setBulkImportPaste('');
    setBulkImportRecipes([]);
    setBulkImportProgress({ current: 0, total: 0, status: '' });
  }

  function closeBulkImportModal() {
    if (bulkImportCreating) return;
    setBulkImportOpen(false);
    setBulkImportStep(1);
    setBulkImportPaste('');
    setBulkImportRecipes([]);
    setBulkImportProgress({ current: 0, total: 0, status: '' });
    setBulkImportError('');
  }

  function parseBulkRecipes() {
    try {
      setBulkImportError('');
      const trimmed = bulkImportPaste.trim();
      
      if (!trimmed) {
        setBulkImportError('❌ Error: Please paste the recipes data.');
        return false;
      }

      let parsed;
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {
        setBulkImportError(`❌ JSON Parsing Error: ${e.message}\n\nMake sure you pasted valid JSON. It should start with [ and end with ].`);
        return false;
      }

      if (!Array.isArray(parsed)) {
        setBulkImportError('❌ Format Error: Expected an array of recipes.\n\nThe data should start with [ and end with ]. Check if the AI response was in the correct format.');
        return false;
      }

      if (parsed.length === 0) {
        setBulkImportError('❌ Empty Data: No recipes found in the data.\n\nMake sure you pasted at least one recipe object.');
        return false;
      }

      const recipes = parsed.map((item, index) => {
        const ing = Array.isArray(item.ingredients) 
          ? item.ingredients 
          : (typeof item.ingredients === 'string' ? item.ingredients.split('\n').filter(Boolean) : []);
        const stp = Array.isArray(item.instructions)
          ? item.instructions
          : (typeof item.instructions === 'string' ? item.instructions.split('\n').filter(Boolean) : []);

        return {
          recipe_name: (item.recipe_name || item.title || item.name || '').toString().trim(),
          description: (item.description || item.desc || '').toString().trim(),
          category: (item.category || '').toString().trim(),
          difficulty: (item.difficulty || 'easy').toString().trim(),
          prep_time_minutes: item.prep_time_minutes || item.prep_time || '',
          cook_time_minutes: item.cook_time_minutes || item.cook_time || '',
          servings: item.servings || '',
          calories: item.calories || '',
          fat: item.fat || '',
          protein: item.protein || '',
          carbs: item.carbs || '',
          ingredients: ing.map(i => (typeof i === 'string' ? i : String(i))).join('\n'),
          instructions: stp.map(s => (typeof s === 'string' ? s : String(s))).join('\n'),
          privacy_setting: item.privacy_setting === 'public' || item.public === true ? 'public' : 'private',
          _index: index + 1,
        };
      });

      const validRecipes = recipes.filter(r => r.recipe_name);
      if (validRecipes.length === 0) {
        const invalidCount = recipes.length - validRecipes.length;
        setBulkImportError(`❌ Validation Error: No recipes with titles found.\n\n${invalidCount} recipe(s) had empty titles. Each recipe must have at least a "recipe_name" field.`);
        return false;
      }

      if (validRecipes.length < recipes.length) {
        const invalidCount = recipes.length - validRecipes.length;
        setBulkImportError(`⚠️ Warning: ${invalidCount} recipe(s) were skipped because they had empty titles. ${validRecipes.length} valid recipe(s) will be created.`);
      }

      setBulkImportRecipes(validRecipes);
      return true;
    } catch (err) {
      setBulkImportError(`❌ Unexpected Error: ${err.message}`);
      return false;
    }
  }

  async function createBulkRecipes() {
    if (bulkImportCreating) return;
    if (bulkImportRecipes.length === 0) {
      setBulkImportError('No recipes to create.');
      return;
    }

    setBulkImportCreating(true);
    setBulkImportStep(4);
    setBulkImportProgress({ current: 0, total: bulkImportRecipes.length, status: 'Starting bulk import...' });

    try {
      const api = await getApiClient();
      let successCount = 0;
      let failCount = 0;
      const failedRecipes = [];

      for (let i = 0; i < bulkImportRecipes.length; i++) {
        const recipe = bulkImportRecipes[i];
        const current = i + 1;

        try {
          setBulkImportProgress({
            current,
            total: bulkImportRecipes.length,
            status: `Creating recipe ${current}/${bulkImportRecipes.length}: "${recipe.recipe_name}"...`,
          });

          const fd = new FormData();
          fd.append('portalId', PORTAL_ID);
          fd.append('objectId', RECIPES_OBJECT_ID);

          Object.entries(recipe).forEach(([key, value]) => {
            if (key !== '_index' && value !== '' && value !== null && value !== undefined) {
              fd.append(`data[${key}]`, value);
            }
          });

          await api.auth.createData(fd);
          successCount++;
          setBulkImportProgress({
            current,
            total: bulkImportRecipes.length,
            status: `✓ Successfully created recipe ${current}/${bulkImportRecipes.length}: "${recipe.recipe_name}"`,
          });
        } catch (err) {
          failCount++;
          
          // Extract detailed error information
          let errorMessage = 'Unknown error';
          let statusCode = '';
          
          if (err?.response?.status) {
            statusCode = ` (${err.response.status})`;
          } else if (err?.status) {
            statusCode = ` (${err.status})`;
          }
          
          if (err?.data?.message) {
            errorMessage = err.data.message;
          } else if (err?.data?.error) {
            errorMessage = err.data.error;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          
          failedRecipes.push({
            name: recipe.recipe_name,
            status: statusCode,
            error: errorMessage,
            index: current,
          });
          
          setBulkImportProgress({
            current,
            total: bulkImportRecipes.length,
            status: `✗ Failed to create recipe ${current}/${bulkImportRecipes.length}: "${recipe.recipe_name}"${statusCode}\n   Error: ${errorMessage}`,
          });
        }

        // Small delay between requests to avoid overwhelming the server
        if (i < bulkImportRecipes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      await loadRecipes(api);
      
      let completionMessage = `✓ Bulk import complete!\n${successCount} created, ${failCount} failed.`;
      if (failedRecipes.length > 0) {
        completionMessage += `\n\nFailed recipes:\n`;
        failedRecipes.forEach(f => {
          completionMessage += `  • #${f.index} "${f.name}"${f.status}\n    → ${f.error}\n`;
        });
      }
      
      setBulkImportProgress({
        current: bulkImportRecipes.length,
        total: bulkImportRecipes.length,
        status: completionMessage,
      });
    } catch (err) {
      setBulkImportProgress({
        current: bulkImportRecipes.length,
        total: bulkImportRecipes.length,
        status: `✗ Error during bulk import: ${err.message}`,
      });
    } finally {
      setBulkImportCreating(false);
    }
  }

  function goToBulkImportStep(step) {
    if (bulkImportCreating) return;
    
    // Clear error when moving forward
    if (step > bulkImportStep) {
      setBulkImportError('');
    }
    
    if (step === 3 && bulkImportRecipes.length === 0) {
      if (!parseBulkRecipes()) return;
    }
    
    setBulkImportStep(step);
  }

  const publicCount = recipes.filter((r) => r.data?.privacy_setting === 'public').length;
  const privateCount = recipes.length - publicCount;
  const savesCount = recipes.reduce((sum, r) => sum + (r.data?.savedCount || r.data?.savesCount || r.data?.savedBy?.length || 0), 0);
  const favoritesCount = useMemo(() => {
    const favoriteSet = new Set(favoriteRecipeIds);
    return recipes.filter((recipe) => favoriteSet.has(String(recipe?._id || ''))).length;
  }, [favoriteRecipeIds, recipes]);

  return (
    <>
      <Navbar
        links={[
          { to: '/', label: 'Home', end: true },
          { to: '/my-account', label: 'My Recipes' },
          { to: '/profile', label: 'Profile' },
        ]}
        user={user}
      />

      <div className="page-header">
        <div className="container">
          <div className="page-header-inner">
            <div>
              <h1 className="page-title">My Recipes</h1>
              <p className="page-subtitle">Manage, edit, and share your personal cookbook</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" type="button" onClick={openNewModal}>+ New Recipe</button>
              <button className="btn btn-secondary" type="button" onClick={openBulkImportModal} style={{ backgroundColor: 'var(--color-secondary, #6c5ce7)' }}>⬆ Bulk Import</button>
            </div>
          </div>
        </div>
      </div>

      <main className="container">
        {loading ? (
          <div className="recipes-loader" aria-label="Loading recipes" role="status">
            <span className="recipes-loader__spinner" />
          </div>
        ) : (
          <>
        <div className="stats-row">
          <div className="stat-card"><div className="stat-card-value">{recipes.length}</div><div className="stat-card-label">Total recipes</div></div>
          <div className="stat-card"><div className="stat-card-value">{publicCount}</div><div className="stat-card-label">Public</div></div>
          <div className="stat-card"><div className="stat-card-value">{privateCount}</div><div className="stat-card-label">Private</div></div>
          <div className="stat-card"><div className="stat-card-value">{savesCount}</div><div className="stat-card-label">Saves by others</div></div>
        </div>

        <div className="section-header">
          <div className="tabs" role="tablist">
          <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('all')}>All</button>
          <button className={`tab-btn ${activeTab === 'public' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('public')}>Public</button>
          <button className={`tab-btn ${activeTab === 'private' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('private')}>Private</button>
          <button className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('favorites')}>Favorites ({favoritesCount})</button>
          </div>
          <select className="sort-select" aria-label="Sort recipes" value={sort} onChange={(e) => { setSort(e.target.value); loadRecipes(null, e.target.value); }}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
          </select>
        </div>

        <div className="recipe-list" id="recipeList">
          {filtered.length ? (
            filtered.map((recipe) => (
              <RecipeListItem
                key={recipe._id}
                recipe={recipe}
                onEdit={() => openEditModal(recipe)}
                onToggleVisibility={() => toggleVisibility(recipe)}
                onDelete={() => deleteRecipe(recipe)}
                isVisibilityLoading={visibilityLoadingId === recipe._id}
                isDeleteLoading={deleteLoadingId === recipe._id}
              />
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🍴</div>
              <div className="empty-state-title">No recipes yet</div>
              <div className="empty-state-desc">Add your first recipe to get started.</div>
              <button className="btn btn-primary" type="button" onClick={openNewModal}>+ New Recipe</button>
            </div>
          )}
        </div>
          </>
        )}
      </main>

      <Footer />

      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modalTitle" onClick={(e) => !isSaving && e.target.classList.contains('modal-overlay') && setModalOpen(false)}>
        <div className="modal">
          <div className="modal-header">
            <h2 className="modal-title" id="modalTitle">{editId ? 'Edit Recipe' : 'New Recipe'}</h2>
            <button className="modal-close" type="button" onClick={() => setModalOpen(false)} disabled={isSaving}>✕</button>
          </div>

          <form onSubmit={onSubmitRecipe} noValidate>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Cover Photo</label>
                <div className="file-upload-area" onClick={() => !isSaving && document.getElementById('coverPhotoInput').click()}>
                  <input
                    type="file"
                    id="coverPhotoInput"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={isSaving}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setImageFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }}
                  />
                  <div className="file-upload-icon">📷</div>
                  <p className="file-upload-text">Drag & drop an image or <span>browse</span></p>
                  {previewUrl ? <img src={previewUrl} className="upload-preview" alt="Preview" style={{ display: 'block' }} /> : null}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="recipeTitle">Recipe Title <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input id="recipeTitle" className="form-input" value={form.recipeTitle} onChange={(e) => setForm((v) => ({ ...v, recipeTitle: e.target.value }))} placeholder="e.g. Grandma's Lasagna" required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="recipeDesc">Description</label>
                <textarea id="recipeDesc" className="form-textarea" rows="3" value={form.recipeDesc} onChange={(e) => setForm((v) => ({ ...v, recipeDesc: e.target.value }))} placeholder="A short description of your recipe..." />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="recipeCategory">Category</label>
                  <select id="recipeCategory" className="form-select" value={form.recipeCategory} onChange={(e) => setForm((v) => ({ ...v, recipeCategory: e.target.value }))}>
                    <option value="">Select category</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="desserts">Desserts</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="snacks">Snacks</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="recipeDifficulty">Difficulty</label>
                  <select id="recipeDifficulty" className="form-select" value={form.recipeDifficulty} onChange={(e) => setForm((v) => ({ ...v, recipeDifficulty: e.target.value }))}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="prepTime">Prep (min)</label>
                  <input id="prepTime" type="number" className="form-input" min="0" value={form.prepTime} onChange={(e) => setForm((v) => ({ ...v, prepTime: e.target.value }))} placeholder="10" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="cookTime">Cook (min)</label>
                  <input id="cookTime" type="number" className="form-input" min="0" value={form.cookTime} onChange={(e) => setForm((v) => ({ ...v, cookTime: e.target.value }))} placeholder="30" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="servings">Servings</label>
                  <input id="servings" type="number" className="form-input" min="1" value={form.servings} onChange={(e) => setForm((v) => ({ ...v, servings: e.target.value }))} placeholder="4" />
                </div>
              </div>

              <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="calories">Calories</label>
                  <input id="calories" type="text" className="form-input" value={form.calories} onChange={(e) => setForm((v) => ({ ...v, calories: e.target.value }))} placeholder="180" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="fat">Fat</label>
                  <input id="fat" type="text" className="form-input" value={form.fat} onChange={(e) => setForm((v) => ({ ...v, fat: e.target.value }))} placeholder="14g" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="carbs">Carbs</label>
                  <input id="carbs" type="text" className="form-input" value={form.carbs} onChange={(e) => setForm((v) => ({ ...v, carbs: e.target.value }))} placeholder="8g" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="protein">Protein</label>
                  <input id="protein" type="text" className="form-input" value={form.protein} onChange={(e) => setForm((v) => ({ ...v, protein: e.target.value }))} placeholder="6g" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ingredients</label>
                <div className="dynamic-list">
                  {ingredients.map((item, i) => (
                    <div
                      className="dynamic-list-item"
                      key={`ing-${i}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onIngredientDrop(i)}
                    >
                      <span
                        aria-hidden="true"
                        draggable={!isSaving}
                        onDragStart={() => setDraggedIngredientIndex(i)}
                        onDragEnd={() => setDraggedIngredientIndex(null)}
                        style={{ userSelect: 'none', opacity: 0.7, cursor: isSaving ? 'default' : 'grab' }}
                      >
                        ⋮⋮
                      </span>
                      <input className="form-input" value={item} onChange={(e) => setIngredients((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))} placeholder="e.g. 2 cups flour" />
                      <button type="button" className="remove-item-btn" aria-label="Remove" onClick={() => ingredients.length > 1 && setIngredients((prev) => prev.filter((_, idx) => idx !== i))}>−</button>
                    </div>
                  ))}
                </div>
                <button type="button" className="add-item-btn" onClick={() => setIngredients((prev) => [...prev, ''])}>+ Add ingredient</button>
              </div>

              <div className="form-group">
                <label className="form-label">Instructions</label>
                <div className="dynamic-list">
                  {steps.map((item, i) => (
                    <div
                      className="dynamic-list-item"
                      key={`step-${i}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onStepDrop(i)}
                    >
                      <span
                        aria-hidden="true"
                        draggable={!isSaving}
                        onDragStart={() => setDraggedStepIndex(i)}
                        onDragEnd={() => setDraggedStepIndex(null)}
                        style={{ userSelect: 'none', opacity: 0.7, cursor: isSaving ? 'default' : 'grab' }}
                      >
                        ⋮⋮
                      </span>
                      <input className="form-input" value={item} onChange={(e) => setSteps((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))} placeholder={`Step ${i + 1}: ...`} />
                      <button type="button" className="remove-item-btn" aria-label="Remove" onClick={() => steps.length > 1 && setSteps((prev) => prev.filter((_, idx) => idx !== i))}>−</button>
                    </div>
                  ))}
                </div>
                <button type="button" className="add-item-btn" onClick={() => setSteps((prev) => [...prev, ''])}>+ Add step</button>
              </div>

              <div className="form-group">
                <label className="form-label">Visibility</label>
                <div className="toggle-wrap">
                  <label className="toggle-switch">
                    <input type="checkbox" checked={form.recipePublic} onChange={(e) => setForm((v) => ({ ...v, recipePublic: e.target.checked }))} />
                    <span className="toggle-slider" />
                  </label>
                  <span className="toggle-label">{form.recipePublic ? 'Public' : 'Private'}</span>
                </div>
                <p className="form-hint">Toggle on to make this recipe visible to everyone.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={isSaving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving} aria-busy={isSaving}>
                {isSaving ? (
                  <>
                    <span className="btn-loader" aria-hidden="true" />
                    Saving...
                  </>
                ) : 'Save Recipe'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Bulk Import Modal */}
      <div className={`modal-overlay ${bulkImportOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="bulkImportTitle" onClick={(e) => !bulkImportCreating && e.target.classList.contains('modal-overlay') && closeBulkImportModal()}>
        <div className="modal" style={{ maxWidth: '600px' }}>
          <div className="modal-header">
            <h2 className="modal-title" id="bulkImportTitle">Bulk Import Recipes</h2>
            <button className="modal-close" type="button" onClick={closeBulkImportModal} disabled={bulkImportCreating}>✕</button>
          </div>

          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Step 1: Show Prompt */}
            {bulkImportStep === 1 && (
              <div>
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '16px' }}>📋 Step 1: Prepare Your Data</h3>
                  <p style={{ marginBottom: '15px', fontSize: '14px', color: '#555' }}>
                    Copy your recipes from a CSV file, Excel spreadsheet, Word document, or any other format. Then use the following prompt with an AI (ChatGPT, Claude, etc.) to convert it to the required format:
                  </p>
                </div>

                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', border: '2px solid #ddd', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '300px', overflowY: 'auto' }}>
                  <p style={{ margin: 0, color: '#666' }}>
{`I will provide you with recipes in various formats (CSV, Excel, Word, text, etc.). 
Please convert them into a valid JSON array format. Each recipe object must have these fields:

{
  "recipe_name": "Recipe Title (required)",
  "description": "Short description (optional)",
  "category": "breakfast|lunch|dinner|desserts|vegetarian|snacks (optional)",
  "difficulty": "easy|medium|hard (optional, defaults to 'easy')",
  "prep_time_minutes": number (optional),
  "cook_time_minutes": number (optional),
  "servings": number (optional),
  "calories": number or string (optional)",
  "fat": string like '14g' (optional)",
  "protein": string like '6g' (optional)",
  "carbs": string like '8g' (optional)",
  "ingredients": ["ingredient 1", "ingredient 2"] or "ingredient 1\ningredient 2" (optional)",
  "instructions": ["step 1", "step 2"] or "step 1\nstep 2" (optional)",
  "privacy_setting": "public|private" (optional, defaults to 'private')"
}

Important:
- Return ONLY valid JSON array with no extra text
- Handle various input formats (separated by commas, newlines, semicolons, etc.)
- Each ingredient and instruction can be an array OR newline-separated string
- Try to extract all available information
- If a field is missing or empty, omit it from the object

After I provide recipes, respond with ONLY the JSON array.`}
                  </p>
                </div>

                <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#e8f4f8', border: '1px solid #b3d9e8', borderRadius: '6px', borderLeft: '4px solid #0288d1' }}>
                  <strong>💡 How it works:</strong>
                  <ol style={{ margin: '8px 0 0 20px', fontSize: '13px', color: '#333' }}>
                    <li>Copy the prompt above</li>
                    <li>Paste it into ChatGPT, Claude, or your preferred AI</li>
                    <li>Provide your recipes (CSV data, text, etc.)</li>
                    <li>Copy the JSON response from the AI</li>
                    <li>Paste it in the next step</li>
                  </ol>
                </div>

                <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', borderLeft: '4px solid #ff9800' }}>
                  <strong>⚠️ Note:</strong> The AI prompt is designed to handle most common recipe formats. Adjust your input data if needed to ensure accuracy.
                </div>
              </div>
            )}

            {/* Step 2: Paste JSON */}
            {bulkImportStep === 2 && (
              <div>
                <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '16px' }}>📝 Step 2: Paste Formatted Recipes</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#555' }}>
                    Paste the JSON array of recipes that the AI generated:
                  </p>
                </div>

                {bulkImportError && (
                  <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: bulkImportError.includes('Warning') ? '#fff3cd' : '#f8d7da', border: `1px solid ${bulkImportError.includes('Warning') ? '#ffc107' : '#f5c6cb'}`, borderRadius: '6px', borderLeft: `4px solid ${bulkImportError.includes('Warning') ? '#ff9800' : '#dc3545'}`, color: bulkImportError.includes('Warning') ? '#856404' : '#721c24', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: bulkImportError.includes('Error') ? 'monospace' : 'inherit' }}>
                    {bulkImportError}
                  </div>
                )}

                <textarea
                  className="form-textarea"
                  rows="15"
                  value={bulkImportPaste}
                  onChange={(e) => {
                    setBulkImportPaste(e.target.value);
                    setBulkImportError('');
                    setBulkImportRecipes([]);
                  }}
                  placeholder={`[
  {
    "recipe_name": "Pasta Carbonara",
    "description": "Classic Italian pasta dish",
    "category": "dinner",
    "difficulty": "easy",
    "prep_time_minutes": 10,
    "cook_time_minutes": 20,
    "servings": 4,
    "ingredients": ["400g pasta", "200g bacon", "3 eggs", "100g parmesan"],
    "instructions": ["Cook pasta", "Fry bacon", "Mix eggs and cheese", "Combine all ingredients"]
  }
]`}
                  style={{ fontFamily: 'monospace', fontSize: '12px', padding: '12px', marginBottom: '15px', borderColor: bulkImportError ? '#dc3545' : undefined }}
                />

                <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f0f4f8', border: '1px solid #cce5ff', borderRadius: '6px', borderLeft: '4px solid #2196f3' }}>
                  <strong>✅ Requirements:</strong>
                  <ul style={{ margin: '8px 0 0 20px', fontSize: '13px', color: '#333' }}>
                    <li>Must be valid JSON (paste exactly what the AI gave you)</li>
                    <li>Must be an array of objects (starts with <code style={{ backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '3px' }}>[</code>, ends with <code style={{ backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '3px' }}>]</code>)</li>
                    <li>Each recipe must have at least a <code style={{ backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '3px' }}>recipe_name</code></li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 3: Preview */}
            {bulkImportStep === 3 && (
              <div>
                <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '16px' }}>👀 Step 3: Preview & Confirm</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#555' }}>
                    Review the {bulkImportRecipes.length} recipe{bulkImportRecipes.length !== 1 ? 's' : ''} that will be created:
                  </p>
                </div>

                <div style={{ marginBottom: '15px', maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: '#fafafa' }}>
                  {bulkImportRecipes.map((recipe, idx) => (
                    <div key={idx} style={{ padding: '12px', borderBottom: idx < bulkImportRecipes.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                      <strong style={{ fontSize: '14px', display: 'block', marginBottom: '6px' }}>
                        #{recipe._index} {recipe.recipe_name}
                      </strong>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                        {recipe.description && <div>📝 {recipe.description}</div>}
                        {recipe.category && <div>🏷️ Category: {recipe.category}</div>}
                        {recipe.difficulty && <div>⭐ Difficulty: {recipe.difficulty}</div>}
                        {recipe.prep_time_minutes && <div>⏱️ Prep: {recipe.prep_time_minutes} min</div>}
                        {recipe.cook_time_minutes && <div>🍳 Cook: {recipe.cook_time_minutes} min</div>}
                        {recipe.servings && <div>🍽️ Servings: {recipe.servings}</div>}
                        {recipe.ingredients && <div>🥘 Ingredients: {recipe.ingredients.split('\n').length} items</div>}
                        {recipe.instructions && <div>📖 Steps: {recipe.instructions.split('\n').length} steps</div>}
                        <div style={{ marginTop: '6px', color: recipe.privacy_setting === 'public' ? '#1976d2' : '#757575' }}>
                          🔒 {recipe.privacy_setting === 'public' ? 'Public' : 'Private'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#e8f5e9', border: '1px solid #81c784', borderRadius: '6px', borderLeft: '4px solid #4caf50' }}>
                  <strong>✓ Ready to create {bulkImportRecipes.length} recipe{bulkImportRecipes.length !== 1 ? 's' : ''}!</strong>
                </div>
              </div>
            )}

            {/* Step 4: Progress */}
            {bulkImportStep === 4 && (
              <div>
                <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '16px' }}>⚙️ Step 4: Importing Recipes</h3>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>
                    Progress: {bulkImportProgress.current}/{bulkImportProgress.total}
                  </div>
                  <div style={{ width: '100%', height: '24px', backgroundColor: '#e0e0e0', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div
                      style={{
                        width: `${(bulkImportProgress.current / bulkImportProgress.total) * 100}%`,
                        height: '100%',
                        backgroundColor: '#4caf50',
                        transition: 'width 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'bold',
                      }}
                    >
                      {bulkImportProgress.total > 0 && `${Math.round((bulkImportProgress.current / bulkImportProgress.total) * 100)}%`}
                    </div>
                  </div>

                  <div style={{ minHeight: '200px', maxHeight: '350px', overflowY: 'auto', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px', color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.6', fontFamily: 'monospace' }}>
                    {bulkImportProgress.status.split('\n').map((line, idx) => {
                      // Color code different types of messages
                      let lineColor = '#333';
                      let lineStyle = {};
                      
                      if (line.includes('✓')) {
                        lineColor = '#2e7d32';
                        lineStyle = { fontWeight: '500' };
                      } else if (line.includes('✗')) {
                        lineColor = '#c62828';
                        lineStyle = { fontWeight: '500' };
                      } else if (line.includes('→')) {
                        lineColor = '#d32f2f';
                        lineStyle = { marginLeft: '12px', fontSize: '11px' };
                      }
                      
                      return (
                        <div key={idx} style={{ color: lineColor, ...lineStyle }}>
                          {line}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {!bulkImportCreating && bulkImportProgress.current === bulkImportProgress.total && bulkImportProgress.status.includes('complete') && (
                  <div style={{ padding: '12px', backgroundColor: '#c8e6c9', border: '1px solid #81c784', borderRadius: '6px', borderLeft: '4px solid #4caf50', color: '#1b5e20', marginBottom: '12px' }}>
                    <strong>✓ Import complete!</strong> Your recipes have been processed.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            {bulkImportStep === 1 && (
              <>
                <button type="button" className="btn btn-ghost" onClick={closeBulkImportModal}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={() => setBulkImportStep(2)}>Next: Paste Recipes →</button>
              </>
            )}

            {bulkImportStep === 2 && (
              <>
                <button type="button" className="btn btn-ghost" onClick={() => setBulkImportStep(1)}>← Back</button>
                <button type="button" className="btn btn-primary" onClick={() => goToBulkImportStep(3)}>Next: Preview →</button>
              </>
            )}

            {bulkImportStep === 3 && (
              <>
                <button type="button" className="btn btn-ghost" onClick={() => setBulkImportStep(2)}>← Back</button>
                <button type="button" className="btn btn-primary" onClick={createBulkRecipes}>Start Import</button>
              </>
            )}

            {bulkImportStep === 4 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={closeBulkImportModal}
                disabled={bulkImportCreating}
              >
                {bulkImportCreating ? 'Importing...' : 'Close'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
