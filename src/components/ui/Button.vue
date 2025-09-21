<template>
  <button :class="buttonClass" :disabled="disabled">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
  },
  size: {
    type: String,
    default: 'default',
  },
  selected: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const buttonClass = computed(() => {
  return [
    'btn',
    `btn-${props.variant}`,
    `btn-${props.size}`,
    { 'btn-selected': props.selected },
  ];
});
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem; /* 6px */
  font-weight: 600;
  transition: all 0.2s ease-in-out;
  border: 2px solid transparent;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

/* Default Variant */
.btn-default {
  background-color: var(--button-enabled-bg);
  color: var(--button-enabled-text);
}
.btn-default:hover:not(:disabled) {
  background-color: var(--primary-color-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Outline Variant */
.btn-outline {
  background-color: transparent;
  color: var(--button-enabled-bg);
  border-color: var(--button-enabled-bg);
}
.btn-outline:hover:not(:disabled) {
  background-color: var(--button-enabled-bg);
  color: var(--button-enabled-text);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Ghost Variant */
.btn-ghost {
  background-color: transparent;
  color: var(--button-enabled-bg);
}
.btn-ghost:hover:not(:disabled) {
  background-color: #dbeafe; /* Light blue */
  transform: translateY(-1px);
}

/* Sizes */
.btn-default {
  padding: 0.625rem 1.25rem; /* 10px 20px */
}
.btn-icon {
  padding: 0.625rem; /* 10px */
}

/* States */
.btn:disabled {
  background-color: var(--button-disabled-bg);
  color: var(--button-disabled-text);
  border-color: var(--button-disabled-bg);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-selected {
  background-color: var(--button-selected-bg);
  color: var(--button-selected-text);
  border-color: var(--button-selected-bg);
}
.btn-selected:hover:not(:disabled) {
  background-color: var(--accent-color-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
