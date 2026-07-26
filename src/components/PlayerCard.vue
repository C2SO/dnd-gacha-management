<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import type { Player } from '../types'
import { pick } from '../utils/random'

const props = withDefaults(
  defineProps<{
    player: Player
    /** All class names, used purely as flicker fodder during the reveal. */
    pool: string[]
    canRemove?: boolean
    canDraw?: boolean
    index?: number
  }>(),
  { canRemove: false, canDraw: true, index: 0 },
)

const emit = defineEmits<{
  rename: [name: string]
  draw: []
  remove: []
}>()

const display = ref<string | null>(props.player.className)
const rolling = ref(false)
let timers: ReturnType<typeof setTimeout>[] = []

function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
}

onBeforeUnmount(clearTimers)

const reducedMotion =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The reveal is driven by the value change rather than by the click, so a class arriving from
 * "draw all" or a single draw animates the same way. Deliberately not `immediate` — a card
 * mounting with a class already set (switching back to this tab, or loading a save) should
 * show it outright rather than replay the reveal.
 */
watch(
  () => props.player.className,
  (next) => {
    clearTimers()
    rolling.value = false

    if (!next) {
      display.value = null
      return
    }
    if (reducedMotion || !props.pool.length) {
      display.value = next
      return
    }

    rolling.value = true
    const start = props.index * 110
    const ticks = 9

    for (let i = 0; i < ticks; i++) {
      timers.push(
        setTimeout(() => {
          display.value = pick(props.pool)
        }, start + i * 55),
      )
    }
    timers.push(
      setTimeout(() => {
        display.value = next
        rolling.value = false
      }, start + ticks * 55),
    )
  },
)
</script>

<template>
  <div class="card panel" :class="{ assigned: !!player.className }">
    <div class="row">
      <input
        class="name"
        type="text"
        :value="player.name"
        :aria-label="`Contender name`"
        maxlength="28"
        @input="emit('rename', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="canRemove"
        class="remove"
        type="button"
        :aria-label="`Remove ${player.name}`"
        @click="emit('remove')"
      >
        ✕
      </button>
    </div>

    <div class="class-line" :class="{ empty: !display, rolling }">
      {{ display || 'Unassigned' }}
    </div>

    <button
      class="btn btn-sm draw"
      type="button"
      :disabled="!canDraw"
      :title="player.className ? 'Burns the current class and deals the next one' : undefined"
      @click="emit('draw')"
    >
      {{ player.className ? 'Burn & redraw' : 'Draw class' }}
    </button>
  </div>
</template>

<style scoped>
.card {
  padding: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  transition: border-color 0.2s;
}

.card.assigned {
  border-color: color-mix(in srgb, var(--cyan) 28%, var(--line));
}

.row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.name {
  flex: 1;
  min-width: 0;
  font-family: var(--ui);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: none;
  border: 0;
  border-bottom: 1px solid var(--line-bright);
  padding: 0.3rem 0;
}

.name:focus {
  border-bottom-color: var(--cyan);
}

.remove {
  background: none;
  border: 1px solid var(--line-bright);
  color: var(--text-faint);
  font-size: 0.7rem;
  line-height: 1;
  padding: 0.3rem 0.45rem;
  cursor: pointer;
}

.remove:hover {
  color: var(--danger);
  border-color: var(--danger);
}

.class-line {
  font-family: var(--display);
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--cyan);
  min-height: 2rem;
  text-shadow: 0 0 24px rgba(0, 229, 255, 0.35);
}

.class-line.empty {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-faint);
  text-shadow: none;
}

.class-line.rolling {
  color: var(--magenta);
  text-shadow: 0 0 24px rgba(255, 46, 136, 0.5);
}

.draw {
  align-self: flex-start;
}
</style>
