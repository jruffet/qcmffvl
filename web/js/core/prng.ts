export interface PRNGInstance {
  next: () => number;
}

export interface PRNG {
  createPRNG: (seed: number) => PRNGInstance;
  newSeed: () => number;
}

export const PRNG: PRNG = {
  createPRNG: (seed: number): PRNGInstance => {
    let m_x = seed | 0;

    return {
      next: () => {
        // SplitMix32 implementation
        m_x = (m_x + 0x9e3779b9) | 0;
        let z = m_x | 0;
        z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
        z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
        return ((z ^ (z >>> 16)) >>> 0) / 4294967296;
      },
    };
  },
  newSeed: function (): number {
    return Math.floor(Math.random() * 10000);
  },
};
