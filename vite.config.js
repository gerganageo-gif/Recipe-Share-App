import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'src/pages/index.html'),
        allRecipes: resolve(__dirname, 'src/pages/all-recipes.html'),
        login: resolve(__dirname, 'src/pages/login.html'),
        register: resolve(__dirname, 'src/pages/register.html'),
        createRecipe: resolve(__dirname, 'src/pages/create-recipe.html'),
        recipeDetails: resolve(__dirname, 'src/pages/recipe-details.html'),
        editRecipe: resolve(__dirname, 'src/pages/edit-recipe.html'),
        myRecipes: resolve(__dirname, 'src/pages/my-recipes.html'),
        admin: resolve(__dirname, 'src/pages/admin.html'),
        profile: resolve(__dirname, 'src/pages/profile.html')
      }
    }
  }
});
