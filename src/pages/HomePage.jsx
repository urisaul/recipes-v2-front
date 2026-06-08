import { useEffect, useMemo, useState } from 'react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import RecipeCard from '../components/RecipeCard';
import { API_BASE, PUBLIC_CATEGORIES_OBJECT_ID, PUBLIC_RECIPES_OBJECT_ID } from '../lib/constants';
import { getVerifiedUser } from '../lib/portalApi';

function toUser(user) {
  const displayName = user?.name || user?.firstName || user?.email || '';
  return displayName
    ? { displayName, shortName: user?.firstName || displayName }
    : null;
}

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [activeCategory, setActiveCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [canLoadMore, setCanLoadMore] = useState(true);

  useEffect(() => {
    getVerifiedUser().then((u) => setUser(toUser(u))).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/public-data/${PUBLIC_CATEGORIES_OBJECT_ID}`)
      .then((res) => res.json())
      .then((data) => {
        const records = Array.isArray(data) ? data : data?.data || data?.records || [];
        setCategories(records.filter((cat) => (cat.properties?.category_name || '').toLowerCase() !== 'all'));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRecipes(1, true);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const visible = recipes.filter((recipe) => {
      const p = recipe.properties || {};
      const title = (p.recipe_name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const cats = p.recipecategories || [];
      const matchesCategory = activeCategory === 'all' || cats.includes(activeCategory);
      const matchesSearch = !q || title.includes(q) || desc.includes(q);
      return matchesCategory && matchesSearch;
    });

    const sorted = [...visible];
    if (sort === 'newest') {
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === 'popular') {
      sorted.sort((a, b) => (b.properties?.views || 0) - (a.properties?.views || 0));
    } else if (sort === 'quickest') {
      sorted.sort((a, b) => {
        const ta = (parseInt(a.properties?.prep_time_minutes, 10) || 0) + (parseInt(a.properties?.cook_time_minutes, 10) || 0);
        const tb = (parseInt(b.properties?.prep_time_minutes, 10) || 0) + (parseInt(b.properties?.cook_time_minutes, 10) || 0);
        if (!ta && !tb) return 0;
        if (!ta) return 1;
        if (!tb) return -1;
        return ta - tb;
      });
    }
    return sorted;
  }, [activeCategory, recipes, search, sort]);

  async function loadRecipes(nextPage, replace = false) {
    if (loadingMore) {
      return;
    }

    if (replace) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await fetch(`${API_BASE}/public-data/${PUBLIC_RECIPES_OBJECT_ID}?page=${nextPage}`).then((res) => res.json());
      const records = Array.isArray(data) ? data : data?.data || data?.records || [];
      setRecipes((prev) => (replace ? records : [...prev, ...records]));
      setCanLoadMore(records.length > 0);
      setPage(nextPage);
    } catch {
      setCanLoadMore(false);
    } finally {
      if (replace) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }

  return (
    <>
      <Navbar
        links={[
          { to: '/', label: 'Home', end: true },
          { to: '/#browse', label: 'Browse' },
        ]}
        user={user}
        showAuthButtons={!user}
      />

      <section className="hero">
        <div className="container">
          <h1 className="hero-title">Discover & Share<br />Amazing Recipes</h1>
          <p className="hero-subtitle">Explore recipes from home cooks all around the world</p>

          <div className="search-bar" role="search">
            <input
              type="text"
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes, ingredients..."
              aria-label="Search recipes"
            />
            <button className="btn btn-primary search-btn" type="button">Search</button>
          </div>

          <div className="hero-tags" role="group" aria-label="Filter by category">
            <button type="button" className={`tag-pill ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')}>All</button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                type="button"
                className={`tag-pill ${activeCategory === cat._id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat._id)}
              >
                {cat.properties?.category_name || ''}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="container" id="browse">
        <div className="section-header">
          <h2 className="section-title">Latest Recipes</h2>
          <select className="sort-select" aria-label="Sort recipes" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="popular">Most popular</option>
            <option value="quickest">Quickest to make</option>
          </select>
        </div>

        {loading ? (
          <div className="recipes-loader" aria-label="Loading recipes" role="status">
            <span className="recipes-loader__spinner" />
          </div>
        ) : null}

        <div className="recipes-grid">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe._id} recipe={recipe} />
          ))}
        </div>

        {!loading && filtered.length === 0 ? (
          <p className="recipes-empty">No recipes found for the current filter.</p>
        ) : null}

        <div className="load-more-wrap">
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => loadRecipes(page + 1, false)}
            disabled={!canLoadMore || loadingMore}
          >
            {loadingMore ? (
              <>
                <span className="btn-loader" aria-hidden="true" />
                Loading...
              </>
            ) : canLoadMore ? 'Load more recipes' : 'No more recipes'}
          </button>
        </div>
      </main>

      <Footer />
    </>
  );
}
