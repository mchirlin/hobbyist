# Badge style recipes (POC-settled 2026-10-01)

The exact, reproducible generation recipes from the badge-art POC. These are the
spec the productionization work (COMMUNITY-MODEL §7.1) should encode as code.

## Shared invoke config

- **Provider:** AWS Bedrock, `bedrock-runtime invoke-model`
- **Region:** `us-west-2`
- **Model ID:** `stability.stable-image-core-v1:1`
- **AWS profile (POC):** `hobbyist` (prod will use a server-side role, not a profile)
- **Request body shape:**
  ```json
  {
    "prompt": "<subject>, <style suffix>",
    "negative_prompt": "<tier negative>",
    "output_format": "png",
    "aspect_ratio": "1:1",
    "seed": <int, fixed per hobby>
  }
  ```
- Response: `{"images": ["<base64 png>"], "finish_reasons": [null]}` — `null`
  finish reason = success (no content filter). Output is **RGB (no alpha)** — crop
  to a circle at display time.

## The two media

### A. Embroidered patch — Copper / Silver / Gold

Style suffix (append after the subject phrase):

```
circular embroidered iron-on patch, single centered {subject-noun} emblem,
flat limited color palette, satin-stitch texture, plain white background, no text,
with a thick solid {METAL} satin-stitch merrowed border,
the entire border thread is {METAL} ({HEX}), uniform {METAL} metallic rim
```

Negative prompt:
```
green border, laurel leaves on border, multicolored border, rainbow rim, mismatched border color
```

Tier anchors (`{METAL}` / `{HEX}`):
| Tier   | METAL                | HEX       |
|--------|----------------------|-----------|
| Copper | polished copper      | `#B87333` |
| Silver | bright silver        | `#C0C0C0` |
| Gold   | rich metallic gold   | `#D4AF37` |

### B. Jeweled enamel medallion — Emerald / Ruby / Diamond

A deliberately DIFFERENT medium (not fabric). Style suffix:

```
luxurious circular cloisonne enamel medallion, polished metal setting,
glossy vitreous enamel artwork of the {subject-noun}, a large faceted {GEM} gemstone,
{GEM} jewels inlaid in the metal rim, ornate jewelry, high gloss, studio lighting,
plain white background, no text, no fabric, no stitching
```

Negative prompt:
```
fabric, cloth, embroidery, stitching, thread, patch texture, matte, muddy
```

Tier anchors (`{GEM}`):
| Tier    | GEM                     |
|---------|-------------------------|
| Emerald | brilliant green emerald |
| Ruby    | deep red ruby           |
| Diamond | sparkling clear diamond |

## Subject phrases (per hobby — curated, NOT the raw hobby name)

The emblem subject is the quality lever. Keep it concrete and singular; props go
as separate elements, never attached to a creature. POC examples:

| Hobby       | Subject phrase                                                  |
|-------------|-----------------------------------------------------------------|
| Birding     | a single bluebird perched on a leafy branch                     |
| Climbing    | a snow-capped mountain peak                                     |
| 3D Printing | a small 3D printer with a plain cube sitting on its print bed   |
| Board Games | three wooden game pawns beside two dice                         |
| Reading     | a single open book with a ribbon bookmark                       |

Gremlins to avoid (observed): "binoculars motif" → binoculars on the beak;
"a glowing object" → eye-like blobs. Be literal and specific.

## Rendering note

Core returns a square white-background RGB PNG. Crop to a circle on display
(CSS `border-radius:50%` / SVG circle clip), or run the generated image through
Stability's remove-background editing model for a true cutout.
