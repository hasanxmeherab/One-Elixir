import { useState, useEffect } from 'react';
import axios from 'axios';

// ✅ FEATURE #6: Hook to fetch product recommendations with caching
export const useRecommendations = (perfumeId, userEmail = null, type = 'hybrid', limit = 5) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!perfumeId && !userEmail) {
      setRecommendations([]);
      setLoading(false);
      return;
    }

    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);

        let response;

        // Determine which endpoint to call based on params
        if (userEmail) {
          response = await axios.get(
            `${API_URL}/api/recommendations/user/${userEmail}?limit=${limit}`
          );
        } else if (perfumeId) {
          response = await axios.get(
            `${API_URL}/api/recommendations/${perfumeId}?type=${type}&limit=${limit}`
          );
        }

        setRecommendations(response.data.recommendations || []);
        setIsCached(response.data.isCached);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError(err.response?.data?.message || 'Failed to load recommendations');
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    // Check client-side cache first (localStorage)
    const cacheKey = `recs_${perfumeId}_${type}_${limit}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        // If cache is less than 1 hour old, use it
        if (Date.now() - parsed.timestamp < 60 * 60 * 1000) {
          setRecommendations(parsed.data);
          setIsCached(true);
          setLoading(false);

          // Fetch fresh data in background (stale-while-revalidate pattern)
          fetchRecommendations();
          return;
        }
      } catch (e) {
        // Invalid cache, fetch fresh
      }
    }

    fetchRecommendations();
  }, [perfumeId, userEmail, type, limit, API_URL]);

  return { recommendations, loading, error, isCached };
};

// ✅ FEATURE #6: Hook to fetch trending products
export const useTrendingProducts = (limit = 10) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(
          `${API_URL}/api/recommendations/trending/products?limit=${limit}`
        );

        setProducts(response.data.recommendations || []);
      } catch (err) {
        console.error('Error fetching trending products:', err);
        setError(err.response?.data?.message || 'Failed to load trending products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    // Check cache
    const cacheKey = `trending_${limit}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (Date.now() - parsed.timestamp < 60 * 60 * 1000) {
          setProducts(parsed.data);
          setLoading(false);
          fetchTrending(); // Background refresh
          return;
        }
      } catch (e) {
        // Invalid cache
      }
    }

    fetchTrending();
  }, [limit, API_URL]);

  return { products, loading, error };
};
