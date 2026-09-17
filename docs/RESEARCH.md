# Research and design decisions

Reviewed September 16–17, 2026. These findings guide the app's visual and audio defaults. No personal health data was used.

## What the evidence supports

| Study | Population and finding | Application and limit |
|---|---|---|
| [Robles et al., 2021: fractal design](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.699962/full) | University participants rated static fractal patterns. Greater complexity increased engagement and preference while relaxation stayed flat or fell. | Use restrained multiscale forms; avoid assuming that more complexity is more calming. No ADHD, coding, or flow outcome. |
| [Juricevic et al., 2010: natural image statistics](https://doi.org/10.1068/p6656) | Undergraduate observers rated generated images. Comfort was often greatest near natural spatial-frequency distributions. | Organic layered texture is a design inference. The shader has not been measured as an exact 1/f image spectrum. Spatial 1/f is not the same as pink-noise audio or brainwave modulation. |
| [McDonnell et al., 2025: nature images and EEG](https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2025.1575102/full) | 58 adults retained for EEG analysis. Nature images changed an engagement-related measure; the cognitive-demand comparison was not significant. | More engagement does not demonstrate better work. Offer motion, still and off. |
| [Zhang et al., 2026: real/virtual nature and adult ADHD](https://www.researchprotocols.org/2026/1/e82970) | Registered study protocol; no published results on the cited page. | Do not cite the planned trial as evidence of efficacy. |
| [Nigg et al., 2024: white/pink noise meta-analysis](https://pubmed.ncbi.nlm.nih.gov/38428577/) | 13 randomized studies, 335 children/young adults with ADHD or elevated symptoms; small task-performance benefit, g=0.249. Comparison groups without ADHD did somewhat worse with noise. Only one study used pink noise. | Pink noise is an optional preference, off by default. No evidence that this three-layer mix improves programming or that browser volume percentages are therapeutic doses. |
| [Woods et al., 2024: amplitude-modulated music](https://pmc.ncbi.nlm.nih.gov/articles/PMC11499863/) | Short attention experiments using self-reported attentional difficulty. Some 16 Hz effects; depth experiment not significant. Brain.fm employment/equity interests disclosed. | Do not add a 16 Hz treatment mode or translate audio modulation into visual flicker. |
| [Kiss & Linnell, 2024: music and vigilance](https://www.nature.com/articles/s41598-024-60218-z) | Habitual music listeners, home vigilance tasks. Less reported mind wandering and some response benefits. | Task and preference specific; not demonstrated during complex coding. |
| [Sümer et al., 2025: music during vigilance](https://www.apa.org/pubs/journals/features/xhp-xhp0001374.pdf) | Preregistered experiments found greater engagement/alertness and less boredom without meaningful improvement in attention performance. | Subjective focus and performance must be evaluated separately. |
| [Si et al., 2025: ASMR breaks](https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2025.1619424/full) | 28 healthy students; four-minute ASMR break during a 30-minute task. No matched silent-break control. | Not a test of continuous ASMR under music. Keep ASMR adjustable and avoid claims about symptom reduction. |

## Engineering choices

The three-second parameter smoothing, twenty-second palette smoothing, color choices, shader detail and initial volume settings are testable product defaults. Research does not establish them as optimal ADHD settings.

No flashing, sudden zooms or whole-screen beat pulses. Reduced motion selects Still and disables Motion while the system preference is active. Visual Off retains the visible players and all listening controls. Relevant accessibility guidance: [Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) and [Three Flashes or Below Threshold](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html).

YouTube does not expose PCM through its IFrame API. Visual cues are authored by genre and chapter, not derived from an FFT. The ASMR and pink-noise controllers have no input path into the visualizer.

## Human evaluation protocol

Use comparable coding or writing tasks in counterbalanced order. Compare Motion, Still and Off, then pink noise on/off with other settings held stable. Record completion, errors, interruptions and time-to-start separately from comfort, distraction and preference. Include a quiet comparison when studying performance. This is a usability exercise, not a clinical trial. No human task-performance evaluation has been completed by the implementation agent.
