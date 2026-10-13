// Image Keychain Maker: multicolor keychain from your picture, with text and an outline border.
// Upload a PNG (split into up to 4 colors by brightness) or an SVG (one color).
// Made for MakerWorld's Parametric Model Maker; also works in desktop OpenSCAD (2025 or newer
// with the Manifold backend is recommended).
// Source: https://github.com/clarkstyx/image-keychain-modeler

/* [Picture] */
// Where the picture comes from. Use the upload button to replace the sample picture.
art_source = "png"; // [png:PNG picture (up to 4 colors), svg:SVG drawing (1 color), none:No picture (text only)]
// Height of the picture in mm. Crop your picture tightly so this is the logo's real height.
art_height = 40; // [15:1:90]
// Number of colors to make from the PNG, not counting the background
color_count = 3; // [1:4]
// Which part of the PNG is background (not printed in color; the base shows through)
background = "light"; // [light:White or light background, dark:Black or dark background, none:No background (keep everything)]
// Brightness cut points, from 0 (black) to 100 (white). Colors are sorted from dark to light.
cut_1 = 20; // [1:99]
cut_2 = 52; // [1:99]
cut_3 = 86; // [1:99]
cut_4 = 95; // [1:99]
// Thinnest detail kept, in mm. Removes jagged edges and thin slivers between colors.
min_detail = 0.6; // [0:0.1:2]
// Which colors win where two colors meet (keeps small details sharp)
detail_priority = "dark"; // [dark:Dark details on top, light:Light details on top]
// Mirror the picture left to right
mirror_picture = false;

/* [Picture colors] */
// Darkest color (also used for SVG pictures)
color_1 = "#111111"; // color
color_2 = "#0B6E3B"; // color
color_3 = "#F2B705"; // color
// Lightest color
color_4 = "#FFFFFF"; // color

/* [Text] */
// Leave empty for no text
text = "HELLO";
// Font
text_font = "Liberation Sans:style=Bold"; // font
// Height of capital letters in mm
letter_height = 8; // [3:0.5:25]
// Space between letters (1 = normal)
letter_spacing = 1.05; // [0.8:0.05:1.6]
// Where the text goes
text_position = "below"; // [below:Below the picture, above:Above the picture]
// Gap between the picture and the text in mm
text_gap = 3; // [0:0.5:15]
text_color = "#111111"; // color

/* [Outline border] */
// Raised border around the edge of the keychain
border = true;
// Border width in mm
border_width = 1.6; // [0.8:0.2:5]
border_color = "#111111"; // color

/* [Base and keyring] */
// Base color (shows through background areas of the picture)
base_color = "#FFFFFF"; // color
// Base thickness in mm
base_thickness = 2; // [1.2:0.2:5]
// How far the base extends past the picture and text, in mm
base_margin = 3; // [1:0.5:10]
// Rounds inside corners of the outline and fills small gaps, in mm
outline_smoothing = 3; // [0:0.5:15]
// How high the picture, text and border stand above the base, in mm
raise_height = 0.6; // [0.2:0.2:3]
// Add a keyring hole
keyring = true;
// Keyring hole diameter in mm
hole_diameter = 5; // [3:0.5:10]
// Material around the hole in mm
ring_wall = 2.5; // [1.5:0.5:6]
// Move the keyring left (-) or right (+) in mm
ring_offset = 0; // [-60:1:60]

/* [Hidden] */
$fa = 2;
$fs = 0.3;
eps = 0.01;
seam = 0.05;

has_art = art_source != "none";
has_text = len(text) > 0;
has_png = art_source == "png";

// ---------- Picture (PNG brightness bands) ----------

// Cut points sorted from dark to light, so any order of the sliders works.
function sorted(v) = len(v) <= 1 ? v
  : let(p = v[0], rest = [for (i = [1:len(v) - 1]) v[i]])
    concat(sorted([for (x = rest) if (x < p) x]), [p], sorted([for (x = rest) if (x >= p) x]));
cuts = sorted([cut_1, cut_2, cut_3, cut_4]);
bg_bands = background == "none" ? 0 : 1;
band_count = color_count + bg_bands;
// Band b (0 = darkest) covers brightness [band_lo(b), band_hi(b)).
function band_lo(b) = b == 0 ? -1 : cuts[b - 1];
function band_hi(b) = b == band_count - 1 ? 101 : cuts[b];
// Picture color k (1..color_count) uses band k-1, or band k when the dark band is background.
function color_band(k) = background == "dark" ? k : k - 1;
function art_color(k) = [color_1, color_2, color_3, color_4][k - 1];
// Cleanup order: the first color listed wins where colors meet; the last one fills leftover gaps.
priority = [for (i = [0:color_count - 1]) detail_priority == "dark" ? i + 1 : color_count - i];

module picture_surface() {
  mirror([mirror_picture ? 1 : 0, 0, 0])
    resize([0, art_height, 0], auto = [true, false, false])
      surface(file = "default.png", center = true);
}

// Area of the picture at least as bright as `level`.
module brighter_than(level) {
  // The surface's base sits at z = -1, so cutting at -0.5 gives the whole picture.
  if (level <= -1) projection(cut = true) translate([0, 0, 0.5]) picture_surface();
  else projection(cut = true) translate([0, 0, -level]) picture_surface();
}

module raw_band(b) {
  difference() {
    brighter_than(band_lo(b));
    if (band_hi(b) <= 100) brighter_than(band_hi(b));
  }
}

module opening(r) {
  if (r <= 0) children();
  else offset(r = r) offset(delta = -r) children();
}

// The tiny square round trip at the end removes near-duplicate points that rounded
// offsets leave behind (they become zero-area triangles in the exported mesh).
module closing(r) {
  if (r <= 0) children();
  else offset(delta = 0.005) offset(delta = -0.005) offset(r = -r) offset(delta = r) children();
}

// Everything in the picture that is not background.
module art_silhouette() {
  if (art_source == "svg") {
    mirror([mirror_picture ? 1 : 0, 0])
      resize([0, art_height], auto = [true, false])
        import("default.svg", center = true);
  } else if (has_png) {
    opening(min_detail / 2) closing(min_detail / 2) {
      if (background == "light") difference() { brighter_than(-1); brighter_than(cuts[band_count - 2]); }
      else if (background == "dark") brighter_than(cuts[0]);
      else brighter_than(-1);
    }
  }
}

// A picture color with thin slivers removed, grown so it also covers the blurry
// edge pixels next to it (otherwise they show up as thin lines of another color).
// It is not clipped to the picture outline here: cutting with shapes that reach past
// an edge avoids zero-width slivers where two outlines would otherwise coincide.
module grown_color(k) {
  offset(delta = max(seam, min_detail / 2)) opening(min_detail / 2) raw_band(color_band(k));
}

// Final, non-overlapping region of picture color k.
module art_region(k) {
  rank = search(k, priority)[0];
  if (rank == color_count - 1) {
    // Lowest priority color fills every gap left by the others.
    difference() {
      art_silhouette();
      for (i = [0:color_count - 2]) grown_color(priority[i]);
    }
  } else {
    difference() {
      intersection() { grown_color(k); art_silhouette(); }
      if (rank > 0) for (i = [0:rank - 1]) grown_color(priority[i]);
    }
  }
}

// ---------- Text and outline ----------

text_y = !has_art ? 0
  : (text_position == "below" ? -1 : 1) * (art_height / 2 + text_gap + letter_height / 2);

module text_shape() {
  if (has_text)
    translate([0, text_y])
      text(text, size = letter_height, font = text_font, spacing = letter_spacing,
           halign = "center", valign = "center");
}

module content() {
  art_silhouette();
  text_shape();
}

// Top edge of the picture + text, used to place the keyring.
content_top = max(has_art ? art_height / 2 : -1e9,
                  has_text ? text_y + letter_height / 2 : -1e9);
ring_r = hole_diameter / 2 + ring_wall;
ring_center = [ring_offset, content_top + base_margin + hole_diameter / 2 - 0.5];

// Fills holes in a shape (OpenSCAD has no built-in for this). Each thin horizontal and
// vertical strip is replaced by its hull, and only points covered both ways are kept:
// enclosed holes fill up, while notches that open to the outside stay open.
module fill_holes(lo, hi, step) {
  intersection() {
    union() for (y = [lo[1] : step : hi[1]])
      hull() intersection() { children(); translate([lo[0], y]) square([hi[0] - lo[0], step]); }
    union() for (x = [lo[0] : step : hi[0]])
      hull() intersection() { children(); translate([x, lo[1]]) square([step, hi[1] - lo[1]]); }
  }
}

content_bottom = min(has_art ? -art_height / 2 : 1e9,
                     has_text ? text_y - letter_height / 2 : 1e9);
// Half of a width that surely contains the picture and the text.
content_half_width = 5 + max(has_art ? art_height * 2 : 0, has_text ? len(text) * letter_height * 0.6 : 0);

module plate_outline() {
  closing(outline_smoothing) offset(r = base_margin)
    fill_holes([-content_half_width, content_bottom - 1], [content_half_width, content_top + 1], 0.5)
      content();
  if (keyring)
    hull() {
      translate(ring_center) circle(r = ring_r);
      translate([ring_offset, content_top - ring_r / 2]) square([ring_r * 1.4, 0.5], center = true);
    }
}

module keyring_hole() {
  if (keyring) translate(ring_center) circle(d = hole_diameter);
}

module border_region() {
  difference() {
    plate_outline();
    offset(delta = -border_width) plate_outline();
    content();
    keyring_hole();
  }
}

// ---------- Parts (each color is its own top-level part) ----------

module raised(h = raise_height) {
  translate([0, 0, base_thickness]) linear_extrude(h) children();
}

color(base_color)
  linear_extrude(base_thickness)
    difference() { plate_outline(); keyring_hole(); }

if (has_png)
  for (k = [1:color_count])
    color(art_color(k)) raised() art_region(k);

if (art_source == "svg")
  color(color_1) raised() art_silhouette();

if (has_text)
  color(text_color) raised() difference() { text_shape(); art_silhouette(); }

if (border)
  color(border_color) raised() border_region();
