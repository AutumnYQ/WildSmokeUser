# GIFs extracted from the previous Google Form

Source form: `Visual Quality Survey` (`1B86PRT__3woH3woM3w0QElNDJsBFWLU2FdAfEv4MhAQ`)

Retrieved from the public form view on 2026-08-20. All 22 media responses were served by Google as animated `image/gif` files and downloaded successfully. The files below are the displayed/resized GIF variants exposed by Google Forms, not guaranteed to be the full-resolution files originally uploaded by the form owner.

The filenames `method-a`, `method-b`, and `method-c` refer to the old form's visible answer order A/B/C. The old form does not reveal the underlying method names.

| Old question | Reference / target | Candidate A | Candidate B | Candidate C | Notes |
|---|---|---|---|---|---|
| 1 | `scene-01-composite.gif` | — | — | — | The form exposes only one GIF for this matrix question; no separate candidate GIFs are present. |
| 2 | `scene-02-reference.gif` | `scene-02-method-a.gif` | `scene-02-method-b.gif` | `scene-02-method-c.gif` | Complete three-candidate trial. |
| 3 | `scene-03-reference.gif` | `scene-03-method-a.gif` | `scene-03-method-b.gif` | `scene-03-method-c.gif` | Complete three-candidate trial. |
| 4 | `scene-04-reference.gif` | `scene-04-method-a.gif` | `scene-04-method-b.gif` | `scene-04-method-c.gif` | Complete three-candidate trial. |
| 5 | `scene-05-reference.gif` | `scene-05-method-a.gif` | `scene-05-method-b.gif` | — | Complete two-candidate trial. |
| 6 | `scene-06-reference.gif` | `scene-06-method-a.gif` | `scene-06-method-b.gif` | — | Complete two-candidate trial. |
| 7 | `scene-07-reference.gif` | `scene-07-method-a.gif` | `scene-07-method-b.gif` | — | Complete two-candidate trial. |

## Using a GIF in `config.js`

The app detects `.gif` automatically:

```js
reference: {
  src: "assets/gifs/scene-02-reference.gif",
  caption: "Reference / target",
},
candidates: [
  { id: "method_a", src: "assets/gifs/scene-02-method-a.gif" },
  { id: "method_b", src: "assets/gifs/scene-02-method-b.gif" },
  { id: "method_c", src: "assets/gifs/scene-02-method-c.gif" },
],
```

GIFs animate automatically and do not expose play/pause or a media timeline. Trial-level response and active time are still logged; video-only `minimumWatchSeconds` validation is skipped for GIF media.
