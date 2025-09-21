<template>
  <div :class="separatorClass"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  orientation: {
    type: String,
    default: 'horizontal',
  },
});

const separatorClass = computed(() => {
  return `separator separator-${props.orientation}`;
});
</script>

<style scoped>
.separator {
  background-color: #e5e7eb; /* gray-200 */
}
.separator-horizontal {
  height: 1px;
  width: 100%;
}
.separator-vertical {
  width: 1px;
  height: 100%;
}
</style>
