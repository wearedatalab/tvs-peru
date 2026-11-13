/* Localizador TVS: 287 puntos de venta y talleres. Leaflet + MarkerCluster sobre el lienzo gris claro de Esri (sin clave).
   En el sitio final esta pieza es Agile Store Locator, cargada desde el Excel maestro. */
(function () {
  "use strict";
  var raiz = document.querySelector("[data-localizador]");
  if (!raiz || !window.TVS_PUNTOS || !window.TVSUI) return;
  var UI = window.TVSUI;
  var $ = function (s, c) { return (c || raiz).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || raiz).querySelectorAll(s)); };
  var P = window.TVS_PUNTOS.slice();
  var ORDEN = {};
  P.forEach(function (p, i) { p._i = i; p._q = UI.norm([p.n, p.d, p.r, p.di, p.de, p.t].join(" ")); ORDEN[p.id] = p; });

  var form = $("[data-loc-filtros]");
  var lista = $("[data-loc-items]");
  var listaCaja = $(".loc-lista");
  var sentinela = $("[data-loc-mas]");
  var cuerpo = $(".loc-cuerpo");
  var nEl = $("[data-loc-n]"), palabraEl = $("[data-loc-palabra]"), vacio = $("[data-loc-vacio]");
  var botonCerca = $("[data-cerca]");
  var TANDA = 30;
  var estado = { servicio: "", linea: "", dep: "", q: "", yo: null };
  var resultado = [], mostrados = 0;
  var mapa = null, grupo = null, marcadores = {}, marcadorYo = null, activo = null;
  var movil = window.matchMedia("(max-width: 899px)");

  /* ---------- estado inicial desde la URL (enlaces del inicio y de la ficha) */
  var url = new URLSearchParams(location.search);
  ["servicio", "linea", "dep", "q"].forEach(function (k) { if (url.get(k)) estado[k] = url.get(k); });
  function marcarControles() {
    $$('input[name="servicio"]', form).forEach(function (r) { r.checked = r.value === estado.servicio; });
    $$('input[name="linea"]', form).forEach(function (r) { r.checked = r.value === estado.linea; });
    var sel = $("#loc-dep");
    sel.value = estado.dep;
    if (sel.value !== estado.dep) { estado.dep = ""; sel.value = ""; }
    $("#loc-q").value = estado.q;
  }
  marcarControles();

  /* ---------- panel de filtros (celular), contador y recuento por departamento */
  var botonOpciones = $("[data-loc-opciones-boton]");
  var panelOpciones = $("[data-loc-opciones]");
  var nFiltros = $("[data-loc-nfiltros]");
  var selDep = $("#loc-dep");
  var textosDep = {};
  Array.prototype.forEach.call(selDep.options, function (o) { if (o.value) textosDep[o.value] = o.value; });
  function abrirOpciones(abrir) {
    panelOpciones.classList.toggle("abierto", abrir);
    botonOpciones.setAttribute("aria-expanded", abrir);
  }
  botonOpciones.addEventListener("click", function () { abrirOpciones(!panelOpciones.classList.contains("abierto")); });
  function actualizarControles() {
    var n = (estado.servicio ? 1 : 0) + (estado.linea ? 1 : 0) + (estado.dep ? 1 : 0);
    nFiltros.hidden = !n;
    nFiltros.textContent = n ? " (" + n + ")" : "";
    // el número junto a cada departamento respeta servicio y línea (no dice «Lima (133)» si la lista muestra 62)
    Array.prototype.forEach.call(selDep.options, function (o) {
      if (!o.value) return;
      var cuenta = P.filter(function (p) {
        return p.de === o.value && (!estado.servicio || p.s.indexOf(estado.servicio) > -1) && (!estado.linea || p.l.indexOf(estado.linea) > -1);
      }).length;
      o.textContent = textosDep[o.value] + " (" + cuenta + ")";
    });
    guia.hidden = !!(estado.dep || estado.q || estado.yo);
  }
  var guia = $("[data-loc-guia]");
  $("[data-cerca-guia]").addEventListener("click", function () { cerca(); });
  $("[data-elegir-dep]").addEventListener("click", function () {
    if (movil.matches) abrirOpciones(true);
    selDep.focus();
    if (selDep.showPicker) { try { selDep.showPicker(); } catch (e) { /* algunos navegadores no lo permiten */ } }
  });

  /* ---------- filtrar y pintar la lista por tandas */
  function filtrar(opciones) {
    opciones = opciones || {};
    actualizarControles();
    var q = UI.norm(estado.q.trim());
    var terminos = q ? q.split(/\s+/) : [];
    resultado = P.filter(function (p) {
      if (estado.servicio && p.s.indexOf(estado.servicio) === -1) return false;
      if (estado.linea && p.l.indexOf(estado.linea) === -1) return false;
      if (estado.dep && p.de !== estado.dep) return false;
      for (var i = 0; i < terminos.length; i++) if (p._q.indexOf(terminos[i]) === -1) return false;
      return true;
    });
    if (estado.yo) {
      resultado.forEach(function (p) { p._km = UI.distancia(estado.yo, p); });
      resultado.sort(function (a, b) { return a._km - b._km; });
    } else {
      resultado.forEach(function (p) { p._km = null; });
      resultado.sort(function (a, b) { return a._i - b._i; });
    }
    lista.innerHTML = "";
    mostrados = 0;
    pintarTanda();
    nEl.textContent = resultado.length;
    palabraEl.textContent = resultado.length === 1 ? "punto" : "puntos";
    vacio.hidden = resultado.length > 0;
    if (listaCaja && !opciones.mantenerScroll) listaCaja.scrollTop = 0;
    actualizarMapa(!opciones.sinEncuadre);
    var nueva = new URLSearchParams();
    ["servicio", "linea", "dep", "q"].forEach(function (k) { if (estado[k]) nueva.set(k, estado[k]); });
    history.replaceState(null, "", location.pathname + (nueva.toString() ? "?" + nueva : ""));
  }
  var botonMas = $("[data-loc-mas-btn]");
  function pintarTanda() {
    var frag = document.createDocumentFragment();
    resultado.slice(mostrados, mostrados + TANDA).forEach(function (p) {
      var li = UI.tarjetaPunto(p);
      if (activo === p.id) li.classList.add("activo");
      frag.appendChild(li);
    });
    lista.appendChild(frag);
    mostrados = Math.min(resultado.length, mostrados + TANDA);
    // En celular la lista está en el flujo de la página: un botón en vez de carga infinita,
    // para que el contenido de abajo (tabla, preguntas, pie) siga siendo alcanzable.
    var quedan = resultado.length - mostrados;
    botonMas.hidden = !(movil.matches && quedan > 0);
    botonMas.textContent = "Ver " + Math.min(TANDA, quedan) + " puntos más (quedan " + quedan + ")";
  }
  botonMas.addEventListener("click", function () {
    var siguiente = mostrados;
    pintarTanda();
    var li = lista.children[siguiente];
    if (li) { var b = li.querySelector("a, button"); if (b) b.focus({ preventScroll: true }); }
  });
  function asegurarVisible(id) {
    var idx = resultado.findIndex(function (p) { return p.id === id; });
    while (idx >= mostrados && mostrados < resultado.length) pintarTanda();
    return document.getElementById(id);
  }
  if ("IntersectionObserver" in window) {
    // Carga por tandas solo dentro del panel de lista de escritorio (tiene su propio desplazamiento).
    var ioMas = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && !movil.matches && mostrados < resultado.length) pintarTanda();
    }, { root: listaCaja, rootMargin: "600px 0px" });
    ioMas.observe(sentinela);
  }

  /* ---------- controles */
  form.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.name === "servicio" || t.name === "linea" || t.name === "dep") {
      estado[t.name] = t.value;
      filtrar();
      window.dataLayer && window.dataLayer.push({ event: "filtro_localizador", filtro: t.name, valor: t.value || "todos" });
    }
  });
  var espera;
  $("#loc-q").addEventListener("input", function (ev) {
    clearTimeout(espera);
    espera = setTimeout(function () { estado.q = ev.target.value; filtrar(); }, 160);
  });
  form.addEventListener("submit", function (ev) { ev.preventDefault(); });
  $("[data-loc-limpiar]").addEventListener("click", function () {
    estado.servicio = estado.linea = estado.dep = estado.q = "";
    marcarControles();
    filtrar();
  });
  // banner de posventa: «Buscar un taller autorizado» filtra los talleres aquí mismo y vuelve al buscador
  Array.prototype.forEach.call(document.querySelectorAll("[data-ver-talleres]"), function (a) {
    a.addEventListener("click", function (ev) {
      ev.preventDefault();
      estado.servicio = "taller";
      marcarControles();
      filtrar();
      window.dataLayer && window.dataLayer.push({ event: "filtro_localizador", filtro: "servicio", valor: "taller", origen: "banner_posventa" });
      var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: quieto ? "auto" : "smooth" });
    });
  });

  /* ---------- lista <-> mapa */
  lista.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-ver-mapa]");
    if (!b) return;
    var id = b.closest("[data-punto]").getAttribute("data-punto");
    if (movil.matches) cambiarVista("mapa", function () { abrirEnMapa(id); });
    else abrirEnMapa(id);
  });
  function resaltar(id, desplazar) {
    activo = id;
    $$(".punto.activo", lista).forEach(function (li) { li.classList.remove("activo"); });
    Object.keys(marcadores).forEach(function (k) {
      var el = marcadores[k].getElement && marcadores[k].getElement();
      if (el && el.firstChild) el.firstChild.classList.toggle("activo", k === id);
    });
    var li = asegurarVisible(id);
    if (li) {
      li.classList.add("activo");
      if (desplazar && !movil.matches) li.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }
  function abrirEnMapa(id) {
    iniciarMapa();
    var m = marcadores[id];
    if (!m || !grupo) return;
    grupo.zoomToShowLayer(m, function () {
      if (mapa.getZoom() < 14) mapa.setView(m.getLatLng(), 15, { animate: true });
      m.openPopup();
      resaltar(id, true);
    });
  }

  /* ---------- vistas en celular */
  var botonesVista = $$("[data-vista]");
  var encuadrePendiente = false;
  function cambiarVista(v, luego) {
    cuerpo.setAttribute("data-vista-activa", v);
    botonesVista.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-vista") === v); });
    if (v !== "mapa") return;
    iniciarMapa();
    setTimeout(function () {
      if (!mapa) return;
      mapa.invalidateSize();
      if (encuadrePendiente && !luego) actualizarMapa(true);
      encuadrePendiente = false;
      if (luego) luego();
    }, 60);
  }
  botonesVista.forEach(function (b) { b.addEventListener("click", function () { cambiarVista(b.getAttribute("data-vista")); }); });

  /* ---------- mapa (se carga después de la lista) */
  function icono(p) {
    var clase = p.s.length > 1 ? "mk mk-vt" : (p.s[0] === "venta" ? "mk mk-v" : "mk");
    // silueta de moto (sprite #moto-tvs de la página); el ancla queda bajo las ruedas, sobre la ubicación
    return L.divIcon({
      className: "", iconSize: [34, 21], iconAnchor: [17, 19], popupAnchor: [0, -18],
      html: '<svg class="' + clase + '" viewBox="-1.6 -0.4 27.2 16.8" aria-hidden="true" focusable="false"><use href="#moto-tvs"/></svg>'
    });
  }
  function popup(p) {
    return '<div class="pop"><p class="pop-tipo">' + UI.esc(p.t) + '</p><p class="pop-nombre">' + UI.esc(p.n) + '</p><p class="pop-dir">' +
      UI.esc(p.d) + "<br>" + UI.esc(p.di) + ", " + UI.esc(p.de) + '</p><a class="btn btn-azul btn-sm" data-punto="' + p.id + '" data-nombre="' +
      UI.esc(p.n) + '" href="https://www.google.com/maps/dir/?api=1&amp;destination=' + p.lat + "," + p.lng +
      '" target="_blank" rel="noopener" data-llegar>Cómo llegar</a></div>';
  }
  function iniciarMapa() {
    if (mapa) return;
    var cargando = $("[data-mapa-cargando]");
    if (!window.L || !L.markerClusterGroup) {
      if (cargando) cargando.textContent = "No se pudo cargar el mapa. La lista sigue disponible.";
      return;
    }
    mapa = L.map("mapa", { zoomControl: true, scrollWheelZoom: false, minZoom: 4, maxZoom: 16, maxBounds: [[-25, -90], [6, -60]] })
      .setView([-9.6, -75.2], 5);
    // la rueda del mouse acerca el mapa solo después de un clic en él; así no atrapa el desplazamiento de la página
    mapa.on("click focus", function () { mapa.scrollWheelZoom.enable(); });
    mapa.on("mouseout blur", function () { mapa.scrollWheelZoom.disable(); });
    var esri = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/";
    L.tileLayer(esri + "World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 16, attribution: "Mapa base &copy; Esri, HERE, Garmin, &copy; colaboradores de OpenStreetMap"
    }).addTo(mapa);
    L.tileLayer(esri + "World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}", { maxZoom: 16, pane: "overlayPane" }).addTo(mapa);
    grupo = L.markerClusterGroup({
      showCoverageOnHover: false, maxClusterRadius: 52, spiderfyOnMaxZoom: true,
      // un grupo también es una moto: más grande según cuántos puntos reúne, con su número y el color de lo que ofrece
      iconCreateFunction: function (c) {
        var n = c.getChildCount();
        var hijos = c.getAllChildMarkers();
        var venta = hijos.some(function (m) { return m.servicios.indexOf("venta") > -1; });
        var taller = hijos.some(function (m) { return m.servicios.indexOf("taller") > -1; });
        var clase = venta && taller ? "mk mk-vt" : (venta ? "mk mk-v" : "mk");
        var t = n < 10 ? "" : n < 50 ? " grupo-m" : " grupo-l";
        var ancho = n < 10 ? 40 : n < 50 ? 46 : 52;
        return L.divIcon({
          className: "grupo" + t, iconSize: [ancho, Math.round(ancho * .62)],
          html: '<svg class="' + clase + '" viewBox="-1.6 -0.4 27.2 16.8" aria-hidden="true" focusable="false"><use href="#moto-tvs"/></svg>' +
            "<span>" + n + "</span>"
        });
      }
    });
    P.forEach(function (p) {
      var m = L.marker([p.lat, p.lng], { icon: icono(p), title: p.n, alt: p.n, keyboard: true });
      m.servicios = p.s;
      m.bindPopup(popup(p), { maxWidth: 280 });
      m.on("click", function () { resaltar(p.id, true); });
      marcadores[p.id] = m;
    });
    mapa.addLayer(grupo);
    if (cargando) cargando.remove();
    actualizarMapa(true);
  }
  function actualizarMapa(encuadrar) {
    if (!mapa) return;
    grupo.clearLayers();
    grupo.addLayers(resultado.map(function (p) { return marcadores[p.id]; }));
    if (!encuadrar || !resultado.length) return;
    if (!document.getElementById("mapa").offsetWidth) { encuadrePendiente = true; return; }  // oculto (celular, vista lista)
    if (estado.yo) {
      var cerca = resultado.slice(0, 6).map(function (p) { return [p.lat, p.lng]; }).concat([[estado.yo.lat, estado.yo.lng]]);
      mapa.fitBounds(cerca, { padding: [50, 50], maxZoom: 14 });
    } else {
      mapa.fitBounds(resultado.map(function (p) { return [p.lat, p.lng]; }), { padding: [36, 36], maxZoom: 14 });
    }
  }

  /* ---------- cerca de mí */
  function cerca() {
    if (!navigator.geolocation) { UI.avisar("<strong>Tu navegador no comparte la ubicación.</strong> Filtra por departamento o busca por distrito."); return; }
    botonCerca.disabled = true;
    var etiqueta = $("span", botonCerca); var antes = etiqueta.textContent; etiqueta.textContent = "Buscando…";
    navigator.geolocation.getCurrentPosition(function (pos) {
      estado.yo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      estado.dep = ""; $("#loc-dep").value = "";
      botonCerca.disabled = false; etiqueta.textContent = antes;
      if (!movil.matches) iniciarMapa();
      if (mapa) {
        if (marcadorYo) marcadorYo.remove();
        marcadorYo = L.marker([estado.yo.lat, estado.yo.lng], {
          icon: L.divIcon({ className: "", html: '<div class="mk-yo"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
          title: "Tu ubicación", zIndexOffset: 1000
        }).addTo(mapa);
      }
      filtrar();
      window.dataLayer && window.dataLayer.push({ event: "buscar_cerca", pagina: "localizador" });
    }, function () {
      botonCerca.disabled = false; etiqueta.textContent = antes;
      UI.avisar("<strong>No pudimos usar tu ubicación.</strong> Revisa el permiso del navegador o filtra por departamento.");
    }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 300000 });
  }
  botonCerca.addEventListener("click", cerca);

  /* ---------- arranque */
  filtrar({ sinEncuadre: true });
  var arrancarMapa = function () {
    if (!movil.matches) iniciarMapa();
    var punto = url.get("punto");
    if (punto && ORDEN[punto]) {
      if (movil.matches) cambiarVista("mapa", function () { abrirEnMapa(punto); });
      else setTimeout(function () { abrirEnMapa(punto); }, 250);
    }
    if (url.get("cerca")) cerca();
  };
  if ("requestIdleCallback" in window) requestIdleCallback(arrancarMapa, { timeout: 900 });
  else setTimeout(arrancarMapa, 200);
  movil.addEventListener && movil.addEventListener("change", function () {
    if (!movil.matches) { cuerpo.setAttribute("data-vista-activa", "lista"); iniciarMapa(); setTimeout(function () { mapa && mapa.invalidateSize(); }, 60); }
  });
})();
