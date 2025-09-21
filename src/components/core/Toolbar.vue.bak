<template>
  <header class="flex items-center gap-1 h-12 border-b bg-card px-2 shrink-0 overflow-x-auto whitespace-nowrap flex-nowrap">
    <h1 class="text-md md:text-lg font-bold font-headline text-primary mr-1 md:mr-2">GeoFlightPlannerCamp</h1>

    <!-- Import/Export -->
    <div class="flex items-center gap-1">
      <Button variant="outline" size="icon" asChild class="h-8 w-8">
        <label for="csv-upload">
          <UploadIcon class="h-4 w-4" />
        </label>
      </Button>
      <input id="csv-upload" type="file" accept=".csv" class="hidden" @change="onImportRequest" />

      <Button variant="outline" size="icon" @click="onExport" :disabled="!hasData" class="h-8 w-8">
        <DownloadIcon class="h-4 w-4" />
      </Button>
    </div>

    <Separator orientation="vertical" class="h-6" />

    <!-- Undo/Redo -->
    <div class="flex items-center gap-1">
      <Button variant="ghost" size="icon" @click="onUndo" :disabled="!canUndo" class="h-8 w-8">
        <Undo2Icon class="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" @click="onRedo" :disabled="!canRedo" class="h-8 w-8">
        <RedoIcon class="h-4 w-4" />
      </Button>
    </div>

    <Separator orientation="vertical" class="h-6" />

    <!-- Editing Tools -->
    <div class="editing-tools-group">
      <div class="flex items-center gap-1">
        <Button variant="ghost" size="icon" @click="onRotate" :disabled="!canRotate" class="h-8 w-8">
          <RotateCcwIcon class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <Separator orientation="vertical" class="h-6" />

    <!-- View Mode -->
    <div class="flex items-center gap-1">
        <DropdownMenu>
            <DropdownMenuTrigger as-child>
                <Button variant="outline" size="icon" class="h-8 w-8">
                    <CubeIcon class="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuRadioGroup v-model="viewMode" @update:modelValue="onViewModeChange">
                    <DropdownMenuRadioItem value="2d">
                        2D View
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="3d">
                        3D View
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>

  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Button from '../ui/Button.vue';
import Separator from '../ui/Separator.vue';
import UploadIcon from '../icons/UploadIcon.vue';
import DownloadIcon from '../icons/DownloadIcon.vue';
import Undo2Icon from '../icons/Undo2Icon.vue';
import RedoIcon from '../icons/RedoIcon.vue';
import CubeIcon from '../icons/CubeIcon.vue';
import RotateCcwIcon from '../icons/RotateCcwIcon.vue';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';


defineProps<{
  canUndo: boolean;
  canRedo: boolean;
  hasData: boolean;
  canRotate: boolean;
}>();

const emit = defineEmits(['importRequest', 'export', 'undo', 'redo', 'rotate', 'viewModeChange']);

const viewMode = ref('2d');

const onImportRequest = (event: Event) => {
  emit('importRequest', event);
};

const onExport = () => {
  emit('export');
};

const onUndo = () => {
  emit('undo');
};

const onRedo = () => {
  emit('redo');
};

const onRotate = () => {
  emit('rotate');
};

const onViewModeChange = (value: string) => {
    emit('viewModeChange', value);
};
</script>

<style scoped>
/* Scoped styles for the toolbar */
header {
  background-color: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.editing-tools-group {
  background-color: #f0f0f0;
  border-radius: 5px;
  padding: 0 4px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
}
</style>
