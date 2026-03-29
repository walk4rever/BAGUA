import Link from 'next/link'
import styles from './page.module.css'

const features = [
  {
    href: '/xun',
    icon: '🌅',
    title: '寻句',
    desc: '此刻想说什么？帮你找到最美的那句诗',
    ready: true,
  },
  {
    href: '/gua',
    icon: '🔮',
    title: '问卦',
    desc: '静心起卦，以古观今',
    ready: true,
  },
  {
    href: '#',
    icon: '🖊️',
    title: '仿写',
    desc: '用王阳明的笔，写你的心',
    ready: false,
  },
  {
    href: '#',
    icon: '📖',
    title: '秒读',
    desc: '任何古文，一键读懂',
    ready: false,
  },
  {
    href: '#',
    icon: '📚',
    title: '精读',
    desc: '三分钟读透一段经典',
    ready: false,
  },
]

export default function Home() {
  return (
    <div className="app">
      <header className={`hero ${styles.homeHero}`}>
        <div className={styles.seal}>庄</div>
        <div className="hero-text">
          <p className="subtitle">读懂 · 说出 · 写美</p>
          <h1>小庄</h1>
          <p className="description">
            天地有大美而不言。小庄帮你用最美的中文，说出心中所感。
          </p>
        </div>
      </header>

      <section className={styles.grid}>
        {features.map((f) => (
          <Link
            key={f.title}
            href={f.ready ? f.href : '#'}
            className={`${styles.card} ${!f.ready ? styles.cardDisabled : ''}`}
          >
            <span className={styles.cardIcon}>{f.icon}</span>
            <div>
              <h2>
                {f.title}
                {!f.ready && <span className={styles.badge}>即将推出</span>}
              </h2>
              <p>{f.desc}</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  )
}
