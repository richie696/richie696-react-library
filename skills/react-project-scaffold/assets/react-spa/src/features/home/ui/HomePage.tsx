import { messages } from "../../../core/i18n/messages";
import styles from "./HomePage.module.scss";

export function HomePage() {
  return (
    <section className={styles.card} aria-labelledby="home-title">
      <h1 id="home-title">{messages.welcome}</h1>
      <p>{messages.nextStep}</p>
    </section>
  );
}
