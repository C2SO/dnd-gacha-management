<script setup lang="ts">
import { computed } from 'vue'
import { useSession } from '../composables/useSession'

const { saveState, lastSavedAt, storageMode } = useSession()

const clock = computed(() => {
  if (!lastSavedAt.value) return ''
  return new Date(lastSavedAt.value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
})

const status = computed(() => {
  if (storageMode.value === 'memory') {
    return { tone: 'warn', text: 'Not persisting — export your session' }
  }
  switch (saveState.value) {
    case 'saving':
      return { tone: 'busy', text: 'Writing…' }
    case 'saved':
      return { tone: 'ok', text: `Autosaved ${clock.value}` }
    default:
      return { tone: 'ok', text: 'Autosave armed' }
  }
})
</script>

<template>
  <div class="chip" :class="status.tone" role="status">
    <span class="dot" aria-hidden="true"></span>
    {{ status.text }}
  </div>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-dim);
  border: 1px solid var(--line-bright);
  padding: 0.4rem 0.7rem;
  white-space: nowrap;
}

.dot {
  width: 6px;
  height: 6px;
  background: currentColor;
}

.ok {
  color: var(--ok);
  border-color: rgba(38, 224, 165, 0.35);
}

.busy {
  color: var(--cyan);
  border-color: rgba(0, 229, 255, 0.35);
}

.warn {
  color: var(--warn);
  border-color: rgba(255, 177, 0, 0.4);
}

.busy .dot {
  animation: pulse 0.9s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.25;
  }
}
</style>
