<template>
  <div class="attribute-editor">
    <h2>Edição de Atributos</h2>
    <form>
      <label for="latitude">Latitude:</label>
      <input type="number" id="latitude" v-model="latitude" />
      
      <label for="longitude">Longitude:</label>
      <input type="number" id="longitude" v-model="longitude" />
      
      <label for="altitude">Altitude:</label>
      <input type="number" id="altitude" v-model="altitude" />
      
      <button @click.prevent="applyChanges">Aplicar Mudanças</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const latitude = ref(0);
const longitude = ref(0);
const altitude = ref(0);

const applyChanges = () => {
  console.log('Mudanças aplicadas:', {
    latitude: latitude.value,
    longitude: longitude.value,
    altitude: altitude.value,
  });
};
</script>

<style scoped>
.attribute-editor {
  background-color: #f9f9f9;
  padding: 20px;
  border-left: 1px solid #e5e7eb;
  width: 350px;
}

h2 {
  font-size: 1.2em;
  margin-bottom: 15px;
  color: #333;
}

form {
  display: flex;
  flex-direction: column;
}

label {
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

input {
  margin-bottom: 15px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 10px;
  background-color: var(--button-enabled-bg);
  color: var(--button-enabled-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

button:hover:not(:disabled) {
  background-color: var(--primary-color-hover);
}
</style>
