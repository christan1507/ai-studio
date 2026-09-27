/**
 * Home view — Showreel ("Prompts that think ahead"), a 1:1 rebuild of the
 * original vanilla scroll-driven WebGL showreel. A Server Component that
 * composes the fixed nav and the scroll stage; all motion/3D lives in the
 * client leaves under `views/home/` and `components/3d/`.
 */
import { homeContent } from "@/data/mocks/home";
import { IntroLoader } from "@/views/home/intro-loader";
import { SiteHeader } from "@/views/home/site-header";
import { ShowreelStage } from "@/views/home/showreel-stage";

export const HomeView = () => (
  <>
    {/* Immersive intro: spins the brand star, then lifts to reveal the page.
        Flips `useLoaderStore.ready` (page uncover) then `revealed` (header). */}
    <IntroLoader />

    {/* SiteHeader self-reveals its (normal-flow) nav bar once the loader has
        fully lifted — see its own `useLoaderStore.revealed` spring. Animating a
        wrapper's opacity around the fixed <header> snapped instead of fading.
        The stage is NOT opacity-gated: it renders at full opacity *under* the
        opaque loader (WebGL warms up) and is simply UNCOVERED when the loader
        lifts — fading a live WebGL surface in would hitch the reveal. */}
    <SiteHeader nav={homeContent.nav} logo={homeContent.logo} cta={homeContent.headerCta} />
    <main>
      <ShowreelStage content={homeContent} />
    </main>
  </>
);
