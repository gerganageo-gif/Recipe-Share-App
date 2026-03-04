import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        register: resolve(__dirname, 'register.html'),
        createRecipe: resolve(__dirname, 'create-recipe.html'),
        recipeDetails: resolve(__dirname, 'recipe-details.html'),
        editRecipe: resolve(__dirname, 'edit-recipe.html'),
        myRecipes: resolve(__dirname, 'my-recipes.html'),
        admin: resolve(__dirname, 'admin.html'),
        profile: resolve(__dirname, 'profile.html')
      }
    }
  }
});
