// Trinket Tray & Coaster Maker: a multicolor trinket tray or coaster with your picture inlaid.
// Upload a PNG (split into up to 4 colors by brightness) or an SVG (one color), add text around
// the edge, a background pattern, feet pockets, a drip groove and a matching coaster holder.
// Made for MakerWorld's Parametric Model Maker; also works in desktop OpenSCAD (2025 or newer
// with the Manifold backend is recommended).
// Source: https://github.com/clarkstyx/Trinket-Tray-Generator

/* [What to make] */
// Trinket tray (walls) or coaster (low lip). Each has its own settings tab below.
product = "tray"; // [tray:Trinket tray, coaster:Coaster]

/* [Picture] */
// Where the picture comes from. Use the upload button to replace the sample picture.
art_source = "png"; // [png:PNG picture (up to 4 colors), svg:SVG drawing (1 color), none:No picture]
// Height of the picture on a TRAY in mm. Crop your picture tightly so this is the logo's real height.
art_height = 110; // [20:1:200]
// Height of the picture on a COASTER in mm
coaster_art_height = 55; // [15:1:120]
// Number of colors to make from the PNG, not counting the background
color_count = 3; // [1:4]
// Which part of the PNG is background (not inlaid; the floor shows through)
background = "light"; // [light:White or light background, dark:Black or dark background, none:No background (keep everything)]
// Brightness cut points, from 0 (black) to 100 (white). Colors are sorted from dark to light.
cut_1 = 20; // [1:99]
cut_2 = 52; // [1:99]
cut_3 = 86; // [1:99]
cut_4 = 95; // [1:99]
// Thinnest detail kept, in mm. Removes jagged edges and thin slivers between colors.
min_detail = 0.8; // [0:0.1:3]
// Which colors win where two colors meet (keeps small details sharp)
detail_priority = "dark"; // [dark:Dark details on top, light:Light details on top]
// Mirror the picture left to right
mirror_picture = false;
// Flush keeps the surface flat; raised makes the picture stand up (not for coasters printed face down)
picture_style = "flush"; // [flush:Flush with the floor, raised:Raised above the floor]
// Extra height of a raised picture in mm
raise_height = 0.6; // [0.2:0.2:3]

/* [Picture colors] */
// Darkest color (also used for SVG pictures)
color_1 = "#111111"; // color
color_2 = "#0B6E3B"; // color
color_3 = "#F2B705"; // color
// Lightest color
color_4 = "#FFFFFF"; // color

/* [Tray settings] */
// Outline of the tray
shape = "silhouette"; // [silhouette:Follow the picture outline, round:Round, oval:Oval, rounded_rect:Rounded rectangle, hexagon:Hexagon, octagon:Octagon]
// Width of round, oval, rectangle, hexagon and octagon trays in mm (hexagon / octagon: across the corners)
tray_width = 150; // [60:1:230]
// Depth (front to back) of oval and rectangle trays in mm
tray_depth = 130; // [60:1:230]
// Corner radius of rectangle trays in mm
corner_radius = 12; // [0:1:50]
// Floor thickness in mm
floor_thickness = 2.4; // [1.2:0.2:6]
// Wall height above the floor in mm
wall_height = 6; // [2:0.5:40]
// Wall thickness in mm
wall_thickness = 2.4; // [1.2:0.2:8]

/* [Coaster settings] */
// Outline of the coaster
coaster_shape = "round"; // [round:Round, square:Rounded square, hexagon:Hexagon, octagon:Octagon, silhouette:Follow the picture outline]
// Size in mm: diameter (round), side (square), across the corners (hexagon, octagon)
coaster_size = 100; // [60:1:150]
// Base thickness in mm (the picture is inlaid into its top)
coaster_base = 3.2; // [2:0.2:6]
// Raised lip around the edge that catches drips, in mm (0 = flat)
lip_height = 1.2; // [0:0.2:4]
// Width of the lip / border in mm
lip_width = 3; // [1.2:0.2:8]
// Channel just inside the lip that catches condensation
drip_groove = true;
groove_width = 1.6; // [0.8:0.2:4]
groove_depth = 0.8; // [0.4:0.2:2]

/* [Shared shape settings] */
// Space between the picture and the inside of the wall, in mm (picture-outline shapes)
margin = 5; // [0:0.5:30]
// Rounds inside corners of picture-outline shapes and fills gaps, in mm
outline_smoothing = 6; // [0:0.5:30]
// How deep the picture is set into the floor, in mm
inlay_depth = 0.8; // [0.4:0.2:2]

/* [Text] */
// Text along the top edge (arc) or above the picture (straight). Not for picture-outline shapes.
text_top = "";
// Text along the bottom edge (arc) or below the picture (straight)
text_bottom = "";
text_style = "arc"; // [arc:Around the edge, straight:Straight lines]
text_font = "Liberation Sans:style=Bold"; // font
// Height of capital letters in mm
text_size = 6; // [3:0.5:20]
// Space between the text, the edge and the picture, in mm
text_gap = 2; // [0.5:0.5:10]
text_color = "#0B6E3B"; // color

/* [Background pattern] */
// Pattern on the free floor around the picture, inlaid in its own color
pattern = "none"; // [none:None, rings:Rings, dots:Dots, grid:Grid, stripes:Stripes, honeycomb:Honeycomb]
// Distance between lines / dots (honeycomb: cell size), in mm
pattern_spacing = 6; // [2:0.5:30]
// Line width (dots: dot size), in mm
pattern_width = 1.2; // [0.6:0.1:6]
pattern_color = "#0B6E3B"; // color

/* [Underside and printing] */
// Feet pockets fit stick-on rubber or felt bumpers; the cork recess fits a cork / felt pad
underside = "flat"; // [flat:Flat, feet:Feet pockets, recess:Cork / felt recess (prints face down)]
feet_count = 4; // [3:1:12]
feet_diameter = 10; // [4:0.5:20]
feet_depth = 1; // [0.4:0.2:3]
// Solid border around the cork recess, in mm
recess_margin = 5; // [2:0.5:20]
// Match your cork or felt sheet, in mm
recess_depth = 1.2; // [0.4:0.2:3]
// Print upside down: the top gets the build plate's glossy or textured finish. Needs a flat top, so the wall / lip is left out.
face_down = false;

/* [Colors] */
// Body color (shows through background areas of the picture)
body_color = "#FFFFFF"; // color
// Color the top of the wall / lip (or a flush border on flat pieces) in a second color
rim = true;
// Height of the colored rim in mm
rim_height = 0.8; // [0.2:0.2:5]
rim_color = "#0B6E3B"; // color

/* [Coaster holder] */
// A cup for a stack of coasters with a front notch and a push-up hole, placed behind the coaster
holder = false;
holder_count = 6; // [2:1:12]
// Gap around the coasters in mm
holder_clearance = 0.8; // [0.2:0.1:3]
holder_wall = 2.4; // [1.2:0.2:6]
holder_color = "#FFFFFF"; // color

/* [Hidden] */
$fa = 2;
$fs = 0.4;
seam = 0.05;

coaster = product == "coaster";
has_png = art_source == "png";
has_art = art_source != "none";
art_h = coaster ? coaster_art_height : art_height;
shape_eff = coaster ? (coaster_shape == "square" ? "rounded_rect" : coaster_shape) : shape;
outline_shape = (shape_eff == "silhouette" && !has_art) ? "round" : shape_eff;
size_w = coaster ? coaster_size : tray_width;
size_d = coaster ? coaster_size : tray_depth;
corner_r = coaster ? 12 : corner_radius;
face_dn = face_down || underside == "recess";
wall_t = coaster ? lip_width : wall_thickness;
wall_h = face_dn ? 0 : coaster ? lip_height : wall_height;
floor_t = coaster ? coaster_base : floor_thickness;
total_height = floor_t + wall_h;
raised = picture_style == "raised" && !face_dn;
art_top = floor_t + (raised ? raise_height : 0);
top_z = max(total_height, art_top);
rim_h = wall_h > 0 ? min(rim_height, wall_h) : min(rim_height, floor_t - inlay_depth);
groove_on = coaster && drip_groove && wall_h > 0 && floor_t - groove_depth >= 1;
groove_band = groove_on ? groove_width + 0.8 : 0;
text_on = outline_shape != "silhouette" && (len(text_top) > 0 || len(text_bottom) > 0);
text_band = text_on ? 2 * text_gap + text_size : 0;
polygon_sides = outline_shape == "hexagon" ? 6 : outline_shape == "octagon" ? 8 : 0;

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
    resize([0, art_h, 0], auto = [true, false, false])
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
      resize([0, art_h], auto = [true, false])
        import("default.svg", center = true);
  } else if (has_png) {
    opening(min_detail / 2) closing(min_detail / 2) {
      if (background == "light") difference() { brighter_than(-1); brighter_than(cuts[band_count - 2]); }
      else if (background == "dark") brighter_than(cuts[0]);
      else brighter_than(-1);
    }
  }
}

// ---------- Outline ----------

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

// Half of a width that surely contains the picture (pieces are at most about 230 mm wide).
art_half_width = min(art_h * 2, 120) + 2;

// Regular polygon with flat sides at the bottom (and top), size across the corners.
module flat_polygon(across, sides) {
  rotate(90 + 180 / sides) circle(d = across, $fn = sides);
}

module outer_outline() {
  if (outline_shape == "silhouette")
    closing(outline_smoothing) offset(r = margin + groove_band + wall_t)
      fill_holes([-art_half_width, -art_h / 2 - 1], [art_half_width, art_h / 2 + 1], 1)
        art_silhouette();
  else if (outline_shape == "round")
    circle(d = size_w);
  else if (outline_shape == "oval")
    scale([1, size_d / size_w]) circle(d = size_w);
  else if (polygon_sides > 0)
    flat_polygon(size_w, polygon_sides);
  else {
    r = min(corner_r, size_w / 2 - 1, size_d / 2 - 1);
    offset(r = r) square([size_w - 2 * r, size_d - 2 * r], center = true);
  }
}

module inner_outline() {
  offset(delta = -wall_t) outer_outline();
}

// Half sizes of the inside of the wall (fixed shapes), used to place text and feet.
inner_rx = polygon_sides > 0 ? (size_w / 2) * cos(180 / polygon_sides) - wall_t : size_w / 2 - wall_t;
inner_ry = polygon_sides > 0 || outline_shape == "round" ? inner_rx : size_d / 2 - wall_t;

// The picture, kept clear of the wall, the drip groove and the text band.
module art_area() {
  intersection() {
    art_silhouette();
    offset(delta = -(1 + (outline_shape == "silhouette" ? groove_band : groove_band + text_band))) inner_outline();
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
      art_area();
      for (i = [0:color_count - 2]) grown_color(priority[i]);
    }
  } else {
    difference() {
      intersection() { grown_color(k); art_area(); }
      if (rank > 0) for (i = [0:rank - 1]) grown_color(priority[i]);
    }
  }
}

// ---------- Text ----------

// Advance widths of Liberation Sans Bold per unit of OpenSCAD text size, so letters can be
// spaced around an arc (other fonts are close enough). Unknown characters use 0.85.
glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,'!?&-#:/";
glyph_w = [1.003, 1.003, 1.003, 1.003, 0.926, 0.848, 1.08, 1.003, 0.386, 0.772, 1.003, 0.848, 1.157,
  1.003, 1.08, 0.926, 1.08, 1.003, 0.926, 0.848, 1.003, 0.926, 1.311, 0.926, 0.926, 0.848, 0.772,
  0.848, 0.772, 0.848, 0.772, 0.463, 0.848, 0.848, 0.386, 0.386, 0.772, 0.386, 1.235, 0.848, 0.848,
  0.848, 0.848, 0.54, 0.772, 0.463, 0.848, 0.772, 1.08, 0.772, 0.772, 0.694, 0.772, 0.772, 0.772,
  0.772, 0.772, 0.772, 0.772, 0.772, 0.772, 0.772, 0.386, 0.386, 0.386, 0.33, 0.463, 0.848, 1.003,
  0.463, 0.772, 0.463, 0.386];
// OpenSCAD's text size that makes capital letters text_size mm tall.
font_size = text_size / 0.9555;
tracking = 0.08 * text_size;
function advance(c) = let(i = search(c, glyphs)) (len(i) ? glyph_w[i[0]] : 0.85) * font_size + tracking;
function line_width(s) = len(s) == 0 ? 0 : [for (i = [0:len(s) - 1]) advance(s[i])] * [for (i = [0:len(s) - 1]) 1] - tracking;
function glyph_center(s, i) = (i == 0 ? 0 : [for (j = [0:i - 1]) advance(s[j])] * [for (j = [0:i - 1]) 1]) + (advance(s[i]) - tracking) / 2;

text_outer_r = min(inner_rx, inner_ry) - groove_band - text_gap;

// One line bent around a circle, letters kept upright to the edge. "top" reads clockwise over
// the top with letters standing outward; "bottom" reads left to right under the bottom.
module arc_line(s, side) {
  r = side == "top" ? text_outer_r - text_size : text_outer_r;
  w = line_width(s);
  for (i = [0:len(s) - 1]) {
    d = glyph_center(s, i) - w / 2;
    theta = side == "top" ? 90 - d / r * 180 / PI : -90 + d / r * 180 / PI;
    translate([r * cos(theta), r * sin(theta)])
      rotate(side == "top" ? theta - 90 : theta + 90)
        text(s[i], size = font_size, font = text_font, halign = "center", valign = "baseline");
  }
}

module text_shape() {
  if (text_on) {
    intersection() {
      union() {
        if (text_style == "arc") {
          if (len(text_top)) arc_line(text_top, "top");
          if (len(text_bottom)) arc_line(text_bottom, "bottom");
        } else {
          if (len(text_top))
            translate([0, inner_ry - groove_band - text_gap - text_size])
              text(text_top, size = font_size, font = text_font, halign = "center", spacing = 1.05);
          if (len(text_bottom))
            translate([0, -(inner_ry - groove_band - text_gap)])
              text(text_bottom, size = font_size, font = text_font, halign = "center", spacing = 1.05);
        }
      }
      // Never into the groove or the wall.
      offset(delta = -(groove_band + 0.2)) inner_outline();
    }
  }
}

// ---------- Pattern ----------

pattern_extent = max(size_w, size_d, art_h + 2 * art_half_width) / 2 + 5;

module pattern_raw() {
  e = pattern_extent;
  if (pattern == "rings") {
    for (r = [pattern_spacing : pattern_spacing : e * 1.42])
      difference() { circle(r = r + pattern_width / 2); circle(r = max(0.01, r - pattern_width / 2)); }
  } else if (pattern == "dots") {
    dy = pattern_spacing * sqrt(3) / 2;
    for (row = [-ceil(e / dy) : ceil(e / dy)], col = [-ceil(e / pattern_spacing) : ceil(e / pattern_spacing)])
      translate([col * pattern_spacing + (abs(row) % 2) * pattern_spacing / 2, row * dy])
        circle(d = pattern_width);
  } else if (pattern == "grid") {
    for (k = [-ceil(e / pattern_spacing) : ceil(e / pattern_spacing)]) {
      translate([k * pattern_spacing, 0]) square([pattern_width, 2 * e], center = true);
      translate([0, k * pattern_spacing]) square([2 * e, pattern_width], center = true);
    }
  } else if (pattern == "stripes") {
    rotate(45)
      for (k = [-ceil(e * 1.42 / pattern_spacing) : ceil(e * 1.42 / pattern_spacing)])
        translate([0, k * pattern_spacing]) square([3 * e, pattern_width], center = true);
  } else if (pattern == "honeycomb") {
    R = pattern_spacing / sqrt(3);
    for (col = [-ceil(e / (1.5 * R)) - 1 : ceil(e / (1.5 * R)) + 1],
         row = [-ceil(e / pattern_spacing) - 1 : ceil(e / pattern_spacing) + 1])
      translate([col * 1.5 * R, row * pattern_spacing + (abs(col) % 2) * pattern_spacing / 2])
        difference() {
          offset(delta = pattern_width / 2) circle(r = R, $fn = 6);
          offset(delta = -pattern_width / 2) circle(r = R, $fn = 6);
        }
  }
}

// Free floor: inside the groove, clear of the picture and of the whole text band.
module pattern_region() {
  gap = max(0.8, min_detail);
  if (pattern != "none")
    opening(min_detail / 2)
      intersection() {
        pattern_raw();
        difference() {
          offset(delta = -(groove_band + gap)) inner_outline();
          // The whole picture, holes included (a white star inside a logo stays plain).
          offset(delta = gap) intersection() {
            fill_holes([-art_half_width, -art_h / 2 - 1], [art_half_width, art_h / 2 + 1], 1) art_silhouette();
            offset(delta = -1) inner_outline();
          }
          if (text_on) offset(delta = max(gap, 0.6 * text_size)) text_shape();
        }
      }
}

// ---------- Underside ----------

module feet_pockets() {
  inset = feet_diameter / 2 + 1.5;
  if (outline_shape == "rounded_rect" && feet_count == 4) {
    for (sx = [-1, 1], sy = [-1, 1])
      translate([sx * (size_w / 2 - wall_t - inset - corner_r * 0.3), sy * (size_d / 2 - wall_t - inset - corner_r * 0.3)])
        circle(d = feet_diameter);
  } else {
    // Evenly around a circle inside the outline (picture-outline shapes: a circle inside the picture).
    r = outline_shape == "silhouette" ? art_h * 0.3 : min(inner_rx, inner_ry) - inset;
    for (i = [0:feet_count - 1])
      rotate(90 + 180 / feet_count + 360 * i / feet_count) translate([r, 0]) circle(d = feet_diameter);
  }
}

// ---------- Parts (each color is its own top-level part) ----------

module inlay(h_top = art_top) {
  translate([0, 0, floor_t - inlay_depth]) linear_extrude(h_top - (floor_t - inlay_depth)) children();
}

// Face-down pieces are turned over about X (a rotation, so the picture still reads
// correctly) and set back on the plate; the finished top then lies on the build plate.
module orient() {
  if (face_dn) translate([0, 0, top_z]) rotate([180, 0, 0]) children();
  else children();
}

// Body: one solid, carved (never glued together from pieces).
module body() {
  difference() {
    // With a rim on a wall / lip, the body stops where the rim starts.
    linear_extrude(rim && wall_h > 0 ? total_height - rim_h : total_height) outer_outline();
    if (wall_h > 0) translate([0, 0, floor_t]) linear_extrude(total_height) inner_outline();
    // Flat pieces: the rim is a flush colored border ring in the top of the base.
    if (rim && wall_h == 0)
      translate([0, 0, total_height - rim_h])
        linear_extrude(rim_h + 1) difference() { offset(delta = 1) outer_outline(); inner_outline(); }
    // Pockets for the picture, text and pattern inlays.
    translate([0, 0, floor_t - inlay_depth]) linear_extrude(inlay_depth + 1) {
      if (has_art) art_area();
      text_shape();
      pattern_region();
    }
    if (groove_on)
      translate([0, 0, floor_t - groove_depth])
        linear_extrude(groove_depth + 1) difference() { inner_outline(); offset(delta = -groove_width) inner_outline(); }
    if (underside == "feet")
      translate([0, 0, -1]) linear_extrude(feet_depth + 1) intersection() {
        feet_pockets();
        offset(delta = -1.5) inner_outline();
      }
    if (underside == "recess")
      translate([0, 0, -1]) linear_extrude(recess_depth + 1) offset(delta = -recess_margin) inner_outline();
  }
}

color(body_color) orient() body();

if (rim)
  color(rim_color) orient()
    translate([0, 0, total_height - rim_h])
      linear_extrude(rim_h) difference() { outer_outline(); inner_outline(); }

if (has_png)
  for (k = [1:color_count])
    color(art_color(k)) orient() inlay() art_region(k);

if (art_source == "svg")
  color(color_1) orient() inlay() art_area();

if (text_on)
  color(text_color) orient() inlay() text_shape();

if (pattern != "none")
  color(pattern_color) orient() inlay() pattern_region();

// Holder: placed behind the coaster on the same plate, printed upright.
holder_height = 2 + max(10, 0.7 * holder_count * top_z);
outline_depth = outline_shape == "silhouette" ? art_h + 2 * (margin + groove_band + wall_t) : size_d;
if (coaster && holder)
  color(holder_color)
    translate([0, outline_depth + 2 * (holder_clearance + holder_wall) + 8, 0])
      difference() {
        linear_extrude(holder_height) offset(delta = holder_clearance + holder_wall) outer_outline();
        translate([0, 0, 2]) linear_extrude(holder_height) offset(delta = holder_clearance) outer_outline();
        // Front notch to slide coasters out, and a push-up hole in the floor.
        translate([-0.225 * size_w, -outline_depth, 5]) cube([0.45 * size_w, outline_depth, holder_height]);
        translate([0, 0, -1]) linear_extrude(4)
          intersection() { circle(d = 0.4 * min(size_w, size_d)); offset(delta = -5) outer_outline(); }
      }
