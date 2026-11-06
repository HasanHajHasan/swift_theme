/* Swift Theme — desk icons in the preset's colours

   Frappe draws a module's icon as an <img> of an SVG with its colours baked
   in: a blue tile (#0289F7), or a grey one (#7B808A) for the framework's own
   modules, and a white glyph. A stylesheet cannot reach inside an image, so a
   preset that wants its icons in its own colours names three on <html> -
   --swift-icon-tile, --swift-icon-muted and --swift-icon-glyph - and this
   builds one SVG colour matrix that sends Frappe's blue tile to the first, its
   grey tile to the second and the white glyph to the third.

   The matrix is affine, so an icon's edges, which are blends of its tile and
   its glyph, land on blends of the new pair. swift-preset-accents.css applies
   it with filter: url(#swift-icon-tint), only under a preset that names the
   colours. A url() filter whose element is missing is ignored, so an icon is
   never blanked: before this runs, or under any other preset, it is Frappe's. */

(function () {
    var ID = "swift-icon-tint";
    var SVG_NS = "http://www.w3.org/2000/svg";
    var html = document.documentElement;

    // Any colour the browser can draw, as [r, g, b] from 0 to 1.
    function channels(value) {
        if (!value || !(window.CSS && CSS.supports("color", value))) return null;
        var ctx = channels.ctx || (channels.ctx = document.createElement("canvas").getContext("2d"));
        if (!ctx) return null;
        ctx.fillStyle = "#000000";
        ctx.fillStyle = value;
        var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(ctx.fillStyle);
        return m ? [1, 2, 3].map(function (i) { return parseInt(m[i], 16) / 255; }) : null;
    }

    function invert3(m) {
        var a = m[0][0], b = m[0][1], c = m[0][2],
            d = m[1][0], e = m[1][1], f = m[1][2],
            g = m[2][0], h = m[2][1], i = m[2][2];
        var det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
        if (Math.abs(det) < 1e-12) return null;
        return [
            [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
            [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
            [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det],
        ];
    }

    // Three source colours, three targets: for each output channel the
    // smallest row [r, g, b, offset] that sends every source to its target.
    function solve(sources, targets) {
        var A = sources.map(function (s) { return s.concat(1); });
        var inv = invert3(A.map(function (p) {
            return A.map(function (q) {
                return p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3] * q[3];
            });
        }));
        if (!inv) return null;
        return [0, 1, 2].map(function (ch) {
            var t = targets.map(function (c) { return c[ch]; });
            var y = inv.map(function (row) { return row[0] * t[0] + row[1] * t[1] + row[2] * t[2]; });
            return [0, 1, 2, 3].map(function (col) {
                return A[0][col] * y[0] + A[1][col] * y[1] + A[2][col] * y[2];
            });
        });
    }

    function render() {
        var style = getComputedStyle(html);
        var targets = ["--swift-icon-glyph", "--swift-icon-tile", "--swift-icon-muted"].map(function (name) {
            return channels(style.getPropertyValue(name).trim());
        });
        var holder = document.getElementById(ID + "-defs");
        if (targets.indexOf(null) !== -1) {
            if (holder) holder.remove();
            return;
        }

        var palette = (window.frappe && frappe.utils && frappe.utils.desktop_pallete) || {};
        var sources = ["#ffffff", palette.blue || "#0289F7", palette.gray || "#7B808A"].map(channels);
        var rows = sources.indexOf(null) === -1 && solve(sources, targets);
        if (!rows) return;

        var values = rows.map(function (r) {
            return [r[0], r[1], r[2], 0, r[3]].map(function (v) { return v.toFixed(5); }).join(" ");
        }).concat("0 0 0 1 0").join(" ");

        if (!holder) {
            if (!document.body) return;
            holder = document.createElementNS(SVG_NS, "svg");
            holder.id = ID + "-defs";
            holder.setAttribute("aria-hidden", "true");
            holder.setAttribute("focusable", "false");
            // Holds the filter only; it must take no room and catch no clicks.
            holder.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
            var filter = document.createElementNS(SVG_NS, "filter");
            filter.id = ID;
            filter.setAttribute("color-interpolation-filters", "sRGB");
            filter.appendChild(document.createElementNS(SVG_NS, "feColorMatrix"));
            holder.appendChild(filter);
            document.body.appendChild(holder);
        }
        var matrix = holder.querySelector("feColorMatrix");
        matrix.setAttribute("type", "matrix");
        matrix.setAttribute("values", values);
    }

    window.SwiftTheme = window.SwiftTheme || {};
    window.SwiftTheme.renderIconTint = render;

    // The preset can change without a reload (the theme dialog, a saved
    // Settings), and its colours arrive inline first and from its stylesheet
    // after: both show on <html>'s attributes.
    if (window.MutationObserver) {
        new MutationObserver(render).observe(html, {
            attributes: true,
            attributeFilter: ["data-swift-preset", "style"],
        });
    }
    document.addEventListener("swift:prefs:applied", render);
    if (document.body) render();
    else document.addEventListener("DOMContentLoaded", render);
})();
