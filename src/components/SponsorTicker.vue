<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { SPONSOR_SLOGANS } from '../data/defaults'

/** Rotating sponsor spot. Pure flavor — the arena is paid for somehow. */
const index = ref(Math.floor(Math.random() * SPONSOR_SLOGANS.length))
const visible = ref(true)
let timer: ReturnType<typeof setInterval> | undefined
let fade: ReturnType<typeof setTimeout> | undefined

const reducedMotion =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

function advance() {
  visible.value = false
  fade = setTimeout(
    () => {
      index.value = (index.value + 1) % SPONSOR_SLOGANS.length
      visible.value = true
    },
    reducedMotion ? 0 : 320,
  )
}

onMounted(() => {
  timer = setInterval(advance, 9000)
})

onBeforeUnmount(() => {
  clearInterval(timer)
  clearTimeout(fade)
})
</script>

<template>
  <div class="ticker" role="complementary" aria-label="Sponsor message">
    <span class="tag">Sponsor</span>
    <span class="slogan" :class="{ out: !visible }">{{ SPONSOR_SLOGANS[index] }}</span>
  </div>
</template>

<style scoped>
.ticker {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-height: 1.6rem;
}

.tag {
  font-family: var(--mono);
  font-size: 0.55rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--bg);
  background: var(--magenta);
  padding: 0.15rem 0.4rem;
  flex: none;
}

.slogan {
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  transition: opacity 0.3s;
}

.slogan.out {
  opacity: 0;
}
</style>
