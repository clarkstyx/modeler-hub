// Parametric Name Tag, for MakerWorld's Parametric Model Maker (OpenSCAD).
//
// Optional company logo on the left (upload a PNG, split into up to 3 colors
// by brightness, or a one-color SVG), then the name in bold over a position,
// on a rounded plate. Three styles:
//   Cut-out  - two stacked layers; the letters are cut through the top layer
//              so the bottom layer's colour shows through (default).
//   Raised   - letters stand up from the plate.
//   Inlay    - like cut-out, but the letter openings are filled flush with the
//              bottom colour, for a smooth face.
// Each colour is its own color() block, so the exported 3MF has one part per
// colour, ready for the AMS. Optional recesses on the back for round magnets.
// The logo code follows https://github.com/clarkstyx/image-keychain-modeler:
// MakerWorld's upload button replaces default.png / default.svg.
//
// OpenSCAD can't measure text, so the plate length is worked out from an
// estimate of the text width; a line that would not fit is shrunk to fit.

/* [Text] */
// Employee name
name = "Valencia";
// Job title (leave empty for a name only)
position = "IT Manager";
// Font for the name and position. If MakerWorld lacks one, it falls back to a default font.
font = "Liberation Sans:style=Bold"; // ["Liberation Sans:style=Bold", "Montserrat:style=Bold", "Poppins:style=Bold", "Roboto:style=Bold", "Open Sans:style=Bold", "Lato:style=Bold", "Oswald:style=Bold", "Bebas Neue:style=Regular", "Noto Sans:style=Bold"]
// Write the name in capitals
name_capitals = true;
// Write the position in capitals
position_capitals = true;
// Height of the name's capital letters (mm)
name_size = 8; // [3:0.5:16]
// Height of the position's capital letters (mm)
position_size = 3.5; // [2:0.5:10]
// Space between the name and the position (mm)
line_gap = 2.5; // [0:0.5:8]
// Extra space between letters (mm). Wider spacing prints cleaner cut-outs.
letter_spacing = 0.3; // [0:0.1:2]
// Make every letter's strokes fatter so small text prints solid (mm). Try 0.1 to 0.2.
thicken = 0; // [0:0.05:0.4]
// A line too long for the plate is first squeezed narrower down to this (%), keeping its height, then made smaller. The position keeps the same size on every tag.
max_squeeze = 80; // [50:5:100]

/* [Logo] */
// Where the logo comes from. Use the upload button to replace the sample logo.
logo_source = "png"; // [png:PNG logo (up to 3 colors), svg:SVG logo (1 color), none:No logo (text only)]
// Logo height (mm); kept inside the plate's padding
logo_height = 15; // [5:0.5:40]
// Space the logo takes on the plate (mm). Equal to the height for a round or square logo, wider for a wide logo.
logo_width = 15; // [5:0.5:80]
// Gap between the logo and the text (mm)
logo_gap = 4; // [0:0.5:15]
// Number of colors to make from the PNG, not counting the white background
logo_colors = 2; // [1:3]
// Brightness cut points, 0 (black) to 100 (white). Colors are sorted dark to light; the last cut splits off the white background.
logo_cut_1 = 40; // [1:99]
logo_cut_2 = 92; // [1:99]
logo_cut_3 = 96; // [1:99]
// Thinnest logo detail kept (mm); removes jagged edges and slivers between colors
logo_min_detail = 0.4; // [0:0.1:2]
// Flat: every logo color at the same height. Layered: the base color stays low and the other colors stand higher.
logo_depth = "Flat"; // [Flat, Layered]
// Layered only: which color stays low (usually the biggest one)
logo_base_color = 2; // [1:Color 1 (darkest), 2:Color 2, 3:Color 3 (lightest)]
// Layered only: how much higher the other colors stand (mm)
logo_detail_height = 0.6; // [0.2:0.2:3]
// Cut-out style: how thick the logo colors sit in their openings (mm)
logo_floor = 0.4; // [0.2:0.2:3]

/* [Logo colors] */
// Darkest logo color (also used for SVG logos)
logo_color_1 = "#111111";
logo_color_2 = "#FBD432";
// Lightest logo color
logo_color_3 = "#E3262B";

/* [Style] */
style = "Cut-out"; // [Cut-out, Raised, Inlay]
// Top layer colour (the face of the tag)
top_color = "#F2F2F2";
// Bottom layer colour (shows through the letters)
bottom_color = "#1A1A1A";
// Show a thin border of the bottom colour around the face (0 = off, mm)
edge_reveal = 0; // [0:0.5:3]

/* [Plate] */
// Plate height (mm). A standard badge is 25 mm.
plate_height = 25; // [15:0.5:60]
// Grow the plate length with the text, between the min and max below
auto_length = true;
// Shortest auto length (mm)
min_length = 60; // [30:1:150]
// Longest auto length (mm); longer text shrinks to fit
max_length = 100; // [40:1:200]
// Plate length when auto length is off (mm). A standard badge is 76 mm.
manual_length = 76; // [30:0.5:200]
// Space between the text and the plate edge (mm)
padding = 5; // [2:0.5:15]
// Corner radius (mm)
corner_radius = 4; // [0:0.5:12]
// Bottom layer thickness (mm), or the plate thickness in the raised style
bottom_thickness = 1.6; // [0.8:0.2:5]
// Top layer thickness (mm): how deep the letters are, or how high they stand when raised
top_thickness = 1.2; // [0.4:0.2:4]

/* [Back] */
// Recesses on the back for round badge magnets
magnet_holes = false;
// Magnet diameter (mm); 0.2 mm clearance is added
magnet_diameter = 10; // [4:0.5:20]
// Magnet thickness (mm); the bottom layer thickens to keep 0.6 mm above it
magnet_depth = 2; // [1:0.1:4]

/* [Hidden] */
$fn = 48;
eps = 0.01;

name_text = name_capitals ? upper(name) : name;
pos_text = position_capitals ? upper(position) : position;
has_name = len(name_text) > 0;
has_pos = len(pos_text) > 0;

// Text width estimate: average advance per character as a share of the
// size, wider for capitals, plus the extra letter spacing.
function est_width(t, size, caps) =
  len(t) == 0 ? 0 : len(t) * (size * (caps ? 0.78 : 0.62) + letter_spacing);
name_w = est_width(name_text, name_size, name_capitals);
pos_w = est_width(pos_text, position_size, position_capitals);
block_w = max(name_w, pos_w);

// The logo takes logo_width on the left, then logo_gap, then the text block
has_logo = logo_source != "none";
has_png = logo_source == "png";
logo_h = min(logo_height, plate_height - 2 * padding);
logo_space = has_logo ? logo_width + (block_w > 0 ? logo_gap : 0) : 0;

plate_len = auto_length
  ? min(max_length, max(min_length, logo_space + block_w + 2 * padding))
  : manual_length;
inner_w = max(5, plate_len - 2 * padding - logo_space); // room for the text
text_w = min(block_w, inner_w);
content_x0 = -(logo_space + text_w) / 2;
logo_cx = content_x0 + logo_width / 2;
text_cx = content_x0 + logo_space + text_w / 2;

// Each line fits on its own: squeezed narrower first, then made smaller, the
// name never shorter than the position. fit_h is the height factor.
sq_min = max(0.5, min(1, max_squeeze / 100));
function fit_h(est, min_u) = est <= inner_w ? 1
  : (inner_w / est >= sq_min ? 1 : max(min_u, inner_w / est / sq_min));
pos_u = fit_h(pos_w, 0.75);
name_u = fit_h(name_w, has_pos ? min(1, position_size * pos_u / name_size) : 0.6);

// Stack the lines and centre the block vertically on the plate
gap = has_name && has_pos ? line_gap : 0;
name_hh = name_size * name_u;
block_h = (has_name ? name_hh : 0) + gap + (has_pos ? position_size * pos_u : 0);
name_base = block_h / 2 - name_hh;
pos_base = -block_h / 2;

base_t = magnet_holes ? max(bottom_thickness, magnet_depth + 0.6) : bottom_thickness;

if (block_h > plate_height - 2 * padding)
  echo("WARNING: the text is taller than the plate; lower the text sizes or raise the plate height.");

// ── Lowercase → capitals (OpenSCAD has no built-in) ──
function upper(s) = str_join([for (c = s) let(o = ord(c)) (o >= 97 && o <= 122) ? chr(o - 32) : c]);
function str_join(v, i = 0) = i >= len(v) ? "" : str(v[i], str_join(v, i + 1));

// ── 2D shapes ──
module plate_shape(inset = 0) {
  r = max(0.01, min(corner_radius, plate_height / 2, plate_len / 2) - inset);
  offset(r = r) square([plate_len - 2 * inset - 2 * r, plate_height - 2 * inset - 2 * r], center = true);
}

// One line of text, centred on x = 0 with its baseline at y. A line wider
// than the plate allows is made u times as tall and squeezed to the width.
module text_line(t, size, est, y, u = 1) {
  spacing = 1 + letter_spacing / (size * 0.7);
  translate([0, y])
    if (est > inner_w)
      resize([inner_w, 0], auto = false) scale([1, u]) glyphs(t, size, spacing);
    else
      glyphs(t, size, spacing);
}

module glyphs(t, size, spacing) {
  if (thicken > 0)
    offset(r = thicken) text(t, size = size, font = font, halign = "center", valign = "baseline", spacing = spacing);
  else
    text(t, size = size, font = font, halign = "center", valign = "baseline", spacing = spacing);
}

module lettering() {
  translate([text_cx, 0]) {
    if (has_name) text_line(name_text, name_size, name_w, name_base, name_u);
    if (has_pos) text_line(pos_text, position_size, pos_w, pos_base, pos_u);
  }
}

// ── Logo (PNG brightness bands, as in the image keychain) ──
function sorted(v) = len(v) <= 1 ? v
  : let(p = v[0], rest = [for (i = [1:len(v) - 1]) v[i]])
    concat(sorted([for (x = rest) if (x < p) x]), [p], sorted([for (x = rest) if (x >= p) x]));
cuts = sorted([logo_cut_1, logo_cut_2, logo_cut_3]);
// Band b (0 = darkest) covers brightness [band_lo(b), band_hi(b)); the band
// after the last color is the white background.
function band_lo(b) = b == 0 ? -1 : cuts[b - 1];
function band_hi(b) = cuts[b];
n_colors = has_png ? logo_colors : (has_logo ? 1 : 0);
function logo_color(k) = [logo_color_1, logo_color_2, logo_color_3][k - 1];

module logo_surface() {
  resize([0, logo_h, 0], auto = [true, false, false])
    surface(file = "default.png", center = true);
}

// Area of the picture at least as bright as `level`
module brighter_than(level) {
  if (level <= -1) projection(cut = true) translate([0, 0, 0.5]) logo_surface();
  else projection(cut = true) translate([0, 0, -level]) logo_surface();
}

module opening(r) {
  if (r <= 0) children();
  else offset(r = r) offset(delta = -r) children();
}

module closing(r) {
  if (r <= 0) children();
  else offset(delta = 0.005) offset(delta = -0.005) offset(r = -r) offset(delta = r) children();
}

// Everything in the logo that is not background, centred on the origin
module logo_silhouette() {
  if (logo_source == "svg")
    resize([0, logo_h], auto = [true, false]) import("default.svg", center = true);
  else if (has_png)
    opening(logo_min_detail / 2) closing(logo_min_detail / 2)
      difference() { brighter_than(-1); brighter_than(cuts[logo_colors - 1]); }
}

module raw_band(b) {
  difference() { brighter_than(band_lo(b)); brighter_than(band_hi(b)); }
}

// A color grown over the blurry edge pixels next to it
module grown_color(k) {
  offset(delta = max(0.05, logo_min_detail / 2)) opening(logo_min_detail / 2) raw_band(k - 1);
}

// Final, non-overlapping region of logo color k. Darker colors win where
// colors meet (keeps dark details sharp); the lightest fills the gaps.
module logo_region(k) {
  if (!has_png) logo_silhouette();
  else if (k == n_colors)
    difference() { logo_silhouette(); for (i = [1:max(1, n_colors - 1)]) if (i >= 1 && i < k) grown_color(i); }
  else
    difference() {
      intersection() { grown_color(k); logo_silhouette(); }
      if (k > 1) for (i = [1:k - 1]) grown_color(i);
    }
}

// Height of logo color k: the base color at h0, the others higher when layered
function logo_h_of(k, h0) =
  logo_depth == "Layered" && n_colors > 1 && k != logo_base_color ? h0 + logo_detail_height : h0;

module logo_parts(h0) {
  if (has_logo)
    for (k = [1:n_colors])
      color(logo_color(k)) translate([logo_cx, 0, base_t])
        linear_extrude(logo_h_of(k, h0)) logo_region(k);
}

// ── 3D parts ──
module bottom_layer() {
  difference() {
    linear_extrude(base_t) plate_shape();
    if (magnet_holes)
      for (x = [-1, 1] * (plate_len / 4))
        translate([x, 0, -eps]) cylinder(d = magnet_diameter + 0.2, h = magnet_depth + eps);
  }
}

module top_layer() {
  translate([0, 0, base_t]) linear_extrude(top_thickness)
    difference() {
      plate_shape(edge_reveal);
      lettering();
      if (has_logo) translate([logo_cx, 0]) logo_silhouette();
    }
}

module letters_up(h) {
  translate([0, 0, base_t]) linear_extrude(h) lettering();
}

if (style == "Raised") {
  // plate in the top colour, letters in the bottom colour standing on it
  color(top_color) bottom_layer();
  color(bottom_color) letters_up(top_thickness);
  logo_parts(top_thickness);
} else {
  color(bottom_color) {
    bottom_layer();
    if (style == "Inlay") letters_up(top_thickness);
  }
  color(top_color) top_layer();
  // the logo's colors fill its opening: a thin floor for Cut-out, flush for Inlay
  logo_parts(style == "Inlay" ? top_thickness : min(logo_floor, top_thickness));
}
