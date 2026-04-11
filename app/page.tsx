import Link from 'next/link'
import styles from './page.module.css'

const features = [
  {
    href: '/xun',
    icon: '寻',
    title: '寻章',
    desc: '描述一个场景，或上传一张照片，帮你找到最贴切的那句话',
    ready: true,
    emphasis: '见意',
  },
  {
    href: '/gua',
    icon: '心',
    title: '问心',
    desc: '当你想不明白时，以周易智慧回应此刻的困惑',
    ready: true,
    emphasis: '解惑',
  },
  {
    href: '/xie',
    icon: '怀',
    title: '述怀',
    desc: '借古人的笔意，替你把心里的话写出来',
    ready: true,
    emphasis: '达情',
  },
  {
    href: '/du',
    icon: '读',
    title: '慢读',
    desc: '订阅每日古文慢读邮件，每天一封，慢慢读懂一段经典',
    ready: true,
    emphasis: '修身',
  },
]

export default function Home() {
  return (
    <div className={`app ${styles.homeApp}`}>
      <header className={`hero ${styles.homeHero}`}>
        <div className={styles.mistLayer} aria-hidden="true" />
        <div className={styles.mountainLayer} aria-hidden="true" />
        <div className={styles.seal}>庄</div>
        <div className={`hero-text ${styles.homeText}`}>
          <p className={styles.subtitle}>表达 · 照见 · 中文之美</p>
          <h1 className={styles.title}>小庄</h1>
          <p className={styles.description}>
            无论是寻章见意、问心解惑，还是述怀达情、慢读修身，小庄都在这里，助你找回中文之美的力量。
          </p>
          <p className={styles.heroQuote}>天地有大美而不言 —— 庄子</p>
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
              <h2 className={styles.cardTitle}>
                {f.title}
                {f.emphasis && <span className={styles.emphasis}>{f.emphasis}</span>}
                {!f.ready && <span className={styles.badge}>即将推出</span>}
              </h2>
              <p className={styles.cardDesc}>{f.desc}</p>
            </div>
          </Link>
        ))}
      </section>

      <footer className={styles.footer}>
        <p className={styles.footerBrand}>小庄</p>
        <p className={styles.footerTagline}>借古人的话，说今天的心</p>
        <p className={styles.footerCopy}>© 2026 小庄 · <a href="https://xz.air7.fun" className={styles.footerLink}>xz.air7.fun</a></p>
      </footer>
    </div>
  )
}
