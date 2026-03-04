import { getSupabaseClient } from './supabaseClient';

const RECIPES_TABLE = 'recipes';
const COMMENTS_TABLE = 'recipe_comments';
const FAVORITES_TABLE = 'recipe_favorites';
const RECIPE_IMAGES_BUCKET = 'recipe-images';

function ensureError(error, fallbackMessage) {
  if (!error) {
    return new Error(fallbackMessage);
  }

  return new Error(error.message || fallbackMessage);
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function normalizeListFilters(input) {
  if (typeof input === 'string') {
    return {
      searchTerm: input.trim(),
      category: ''
    };
  }

  return {
    searchTerm: String(input?.searchTerm || '').trim(),
    category: String(input?.category || '').trim()
  };
}

function recipeSelectStatement() {
  return `
    id,
    author_id,
    category,
    title,
    description,
    ingredients,
    instructions,
    image_url,
    image_path,
    created_at,
    updated_at,
    author:profiles!recipes_author_id_fkey(
      id,
      display_name,
      email,
      avatar_url
    )
  `;
}

function commentSelectStatement() {
  return `
    id,
    recipe_id,
    author_id,
    content,
    created_at,
    updated_at,
    author:profiles!recipe_comments_author_id_fkey(
      id,
      display_name,
      email,
      avatar_url
    )
  `;
}

export async function listRecipes(filters = '') {
  const { searchTerm, category } = normalizeListFilters(filters);
  const supabase = getSupabaseClient();
  let query = supabase
    .from(RECIPES_TABLE)
    .select(recipeSelectStatement())
    .order('created_at', { ascending: false });

  if (searchTerm.trim()) {
    query = query.or(`title.ilike.%${searchTerm.trim()}%,description.ilike.%${searchTerm.trim()}%`);
  }

  if (category && category !== 'Всички') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    throw ensureError(error, 'Неуспешно зареждане на рецепти.');
  }

  return data;
}

export async function listFeaturedRecipes(limit = 3) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(RECIPES_TABLE)
    .select(recipeSelectStatement())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw ensureError(error, 'Неуспешно зареждане на рецепти на седмицата.');
  }

  return data;
}

export async function getRecipeById(recipeId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(RECIPES_TABLE)
    .select(recipeSelectStatement())
    .eq('id', recipeId)
    .maybeSingle();

  if (error) {
    throw ensureError(error, 'Неуспешно зареждане на рецепта.');
  }

  return data;
}

export async function listRecipesByOwner(userId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(RECIPES_TABLE)
    .select(recipeSelectStatement())
    .eq('author_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw ensureError(error, 'Неуспешно зареждане на твоите рецепти.');
  }

  return data;
}

export async function createRecipe(recipeData) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(RECIPES_TABLE)
    .insert(recipeData)
    .select(recipeSelectStatement())
    .single();

  if (error) {
    throw ensureError(error, 'Неуспешно създаване на рецепта.');
  }

  return data;
}

export async function updateRecipe(recipeId, recipeData) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(RECIPES_TABLE)
    .update(recipeData)
    .eq('id', recipeId)
    .select(recipeSelectStatement())
    .single();

  if (error) {
    throw ensureError(error, 'Неуспешно редактиране на рецепта.');
  }

  return data;
}

export async function deleteRecipe(recipeId) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from(RECIPES_TABLE)
    .delete()
    .eq('id', recipeId);

  if (error) {
    throw ensureError(error, 'Неуспешно изтриване на рецепта.');
  }
}

export async function uploadRecipeImage(file, userId) {
  const supabase = getSupabaseClient();
  const cleanName = sanitizeFileName(file.name);
  const storagePath = `${userId}/${Date.now()}-${cleanName}`;

  const { error: uploadError } = await supabase
    .storage
    .from(RECIPE_IMAGES_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    throw ensureError(uploadError, 'Неуспешно качване на изображение.');
  }

  const { data } = supabase
    .storage
    .from(RECIPE_IMAGES_BUCKET)
    .getPublicUrl(storagePath);

  return {
    imageUrl: data.publicUrl,
    imagePath: storagePath
  };
}

export async function deleteRecipeImage(imagePath) {
  if (!imagePath) {
    return;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .storage
    .from(RECIPE_IMAGES_BUCKET)
    .remove([imagePath]);

  if (error) {
    throw ensureError(error, 'Неуспешно премахване на изображение.');
  }
}

export async function listRecipeComments(recipeId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(COMMENTS_TABLE)
    .select(commentSelectStatement())
    .eq('recipe_id', recipeId)
    .order('created_at', { ascending: false });

  if (error) {
    throw ensureError(error, 'Неуспешно зареждане на коментари.');
  }

  return data;
}

export async function createRecipeComment(commentData) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(COMMENTS_TABLE)
    .insert(commentData)
    .select(commentSelectStatement())
    .single();

  if (error) {
    throw ensureError(error, 'Неуспешно публикуване на коментар.');
  }

  return data;
}

export async function deleteRecipeComment(commentId) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from(COMMENTS_TABLE)
    .delete()
    .eq('id', commentId);

  if (error) {
    throw ensureError(error, 'Неуспешно изтриване на коментар.');
  }
}

export async function listRecipesForAdmin(limit = 20) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(RECIPES_TABLE)
    .select(recipeSelectStatement())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw ensureError(error, 'Неуспешно зареждане на рецепти за модерация.');
  }

  return data;
}

export async function isRecipeFavorited(recipeId, userId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(FAVORITES_TABLE)
    .select('recipe_id')
    .eq('recipe_id', recipeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw ensureError(error, 'Неуспешна проверка на любими рецепти.');
  }

  return Boolean(data);
}

export async function toggleRecipeFavorite(recipeId, userId, currentlyFavorited) {
  const supabase = getSupabaseClient();

  if (currentlyFavorited) {
    const { error } = await supabase
      .from(FAVORITES_TABLE)
      .delete()
      .eq('recipe_id', recipeId)
      .eq('user_id', userId);

    if (error) {
      throw ensureError(error, 'Неуспешно премахване от любими.');
    }

    return false;
  }

  const { error } = await supabase
    .from(FAVORITES_TABLE)
    .insert({ recipe_id: recipeId, user_id: userId });

  if (error) {
    throw ensureError(error, 'Неуспешно добавяне в любими.');
  }

  return true;
}

export async function countRecipeFavorites(recipeId) {
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from(FAVORITES_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('recipe_id', recipeId);

  if (error) {
    throw ensureError(error, 'Неуспешно зареждане на брой любими.');
  }

  return count ?? 0;
}

export async function listFavoriteRecipesByUser(userId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(FAVORITES_TABLE)
    .select(`
      recipe_id,
      created_at,
      recipe:recipes!recipe_favorites_recipe_id_fkey(
        id,
        author_id,
        category,
        title,
        description,
        ingredients,
        instructions,
        image_url,
        image_path,
        created_at,
        updated_at,
        author:profiles!recipes_author_id_fkey(
          id,
          display_name,
          email,
          avatar_url
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw ensureError(error, 'Неуспешно зареждане на любими рецепти.');
  }

  return (data || [])
    .map((entry) => entry.recipe)
    .filter((recipe) => recipe && recipe.author_id !== userId);
}

export async function getRecipeCategoryCounts(filters = '') {
  const { searchTerm } = normalizeListFilters(filters);
  const supabase = getSupabaseClient();
  let query = supabase
    .from(RECIPES_TABLE)
    .select('category');

  if (searchTerm) {
    query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw ensureError(error, 'Неуспешно зареждане на броя рецепти по категории.');
  }

  const counts = { Всички: data?.length || 0 };

  for (const entry of data || []) {
    const category = entry.category || 'Основни ястия';
    counts[category] = (counts[category] || 0) + 1;
  }

  return counts;
}
