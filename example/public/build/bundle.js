
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var dist = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
        module.exports = factory() ;
    }(commonjsGlobal, (function () {
        function noop() { }
        function assign(tar, src) {
            // @ts-ignore
            for (const k in src)
                tar[k] = src[k];
            return tar;
        }
        function run(fn) {
            return fn();
        }
        function blank_object() {
            return Object.create(null);
        }
        function run_all(fns) {
            fns.forEach(run);
        }
        function is_function(thing) {
            return typeof thing === 'function';
        }
        function safe_not_equal(a, b) {
            return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
        }
        function is_empty(obj) {
            return Object.keys(obj).length === 0;
        }
        function exclude_internal_props(props) {
            const result = {};
            for (const k in props)
                if (k[0] !== '$')
                    result[k] = props[k];
            return result;
        }
        function null_to_empty(value) {
            return value == null ? '' : value;
        }

        function append(target, node) {
            target.appendChild(node);
        }
        function insert(target, node, anchor) {
            target.insertBefore(node, anchor || null);
        }
        function detach(node) {
            node.parentNode.removeChild(node);
        }
        function element(name) {
            return document.createElement(name);
        }
        function text(data) {
            return document.createTextNode(data);
        }
        function space() {
            return text(' ');
        }
        function listen(node, event, handler, options) {
            node.addEventListener(event, handler, options);
            return () => node.removeEventListener(event, handler, options);
        }
        function prevent_default(fn) {
            return function (event) {
                event.preventDefault();
                // @ts-ignore
                return fn.call(this, event);
            };
        }
        function stop_propagation(fn) {
            return function (event) {
                event.stopPropagation();
                // @ts-ignore
                return fn.call(this, event);
            };
        }
        function attr(node, attribute, value) {
            if (value == null)
                node.removeAttribute(attribute);
            else if (node.getAttribute(attribute) !== value)
                node.setAttribute(attribute, value);
        }
        function children(element) {
            return Array.from(element.childNodes);
        }
        function set_input_value(input, value) {
            input.value = value == null ? '' : value;
        }
        function toggle_class(element, name, toggle) {
            element.classList[toggle ? 'add' : 'remove'](name);
        }
        function custom_event(type, detail) {
            const e = document.createEvent('CustomEvent');
            e.initCustomEvent(type, false, false, detail);
            return e;
        }

        let current_component;
        function set_current_component(component) {
            current_component = component;
        }
        function get_current_component() {
            if (!current_component)
                throw new Error('Function called outside component initialization');
            return current_component;
        }
        function onMount(fn) {
            get_current_component().$$.on_mount.push(fn);
        }
        function createEventDispatcher() {
            const component = get_current_component();
            return (type, detail) => {
                const callbacks = component.$$.callbacks[type];
                if (callbacks) {
                    // TODO are there situations where events could be dispatched
                    // in a server (non-DOM) environment?
                    const event = custom_event(type, detail);
                    callbacks.slice().forEach(fn => {
                        fn.call(component, event);
                    });
                }
            };
        }
        // TODO figure out if we still want to support
        // shorthand events, or if we want to implement
        // a real bubbling mechanism
        function bubble(component, event) {
            const callbacks = component.$$.callbacks[event.type];
            if (callbacks) {
                callbacks.slice().forEach(fn => fn(event));
            }
        }

        const dirty_components = [];
        const binding_callbacks = [];
        const render_callbacks = [];
        const flush_callbacks = [];
        const resolved_promise = Promise.resolve();
        let update_scheduled = false;
        function schedule_update() {
            if (!update_scheduled) {
                update_scheduled = true;
                resolved_promise.then(flush);
            }
        }
        function tick() {
            schedule_update();
            return resolved_promise;
        }
        function add_render_callback(fn) {
            render_callbacks.push(fn);
        }
        let flushing = false;
        const seen_callbacks = new Set();
        function flush() {
            if (flushing)
                return;
            flushing = true;
            do {
                // first, call beforeUpdate functions
                // and update components
                for (let i = 0; i < dirty_components.length; i += 1) {
                    const component = dirty_components[i];
                    set_current_component(component);
                    update(component.$$);
                }
                set_current_component(null);
                dirty_components.length = 0;
                while (binding_callbacks.length)
                    binding_callbacks.pop()();
                // then, once components are updated, call
                // afterUpdate functions. This may cause
                // subsequent updates...
                for (let i = 0; i < render_callbacks.length; i += 1) {
                    const callback = render_callbacks[i];
                    if (!seen_callbacks.has(callback)) {
                        // ...so guard against infinite loops
                        seen_callbacks.add(callback);
                        callback();
                    }
                }
                render_callbacks.length = 0;
            } while (dirty_components.length);
            while (flush_callbacks.length) {
                flush_callbacks.pop()();
            }
            update_scheduled = false;
            flushing = false;
            seen_callbacks.clear();
        }
        function update($$) {
            if ($$.fragment !== null) {
                $$.update();
                run_all($$.before_update);
                const dirty = $$.dirty;
                $$.dirty = [-1];
                $$.fragment && $$.fragment.p($$.ctx, dirty);
                $$.after_update.forEach(add_render_callback);
            }
        }
        const outroing = new Set();
        function transition_in(block, local) {
            if (block && block.i) {
                outroing.delete(block);
                block.i(local);
            }
        }

        const globals = (typeof window !== 'undefined'
            ? window
            : typeof globalThis !== 'undefined'
                ? globalThis
                : commonjsGlobal);
        function mount_component(component, target, anchor, customElement) {
            const { fragment, on_mount, on_destroy, after_update } = component.$$;
            fragment && fragment.m(target, anchor);
            if (!customElement) {
                // onMount happens before the initial afterUpdate
                add_render_callback(() => {
                    const new_on_destroy = on_mount.map(run).filter(is_function);
                    if (on_destroy) {
                        on_destroy.push(...new_on_destroy);
                    }
                    else {
                        // Edge case - component was destroyed immediately,
                        // most likely as a result of a binding initialising
                        run_all(new_on_destroy);
                    }
                    component.$$.on_mount = [];
                });
            }
            after_update.forEach(add_render_callback);
        }
        function destroy_component(component, detaching) {
            const $$ = component.$$;
            if ($$.fragment !== null) {
                run_all($$.on_destroy);
                $$.fragment && $$.fragment.d(detaching);
                // TODO null out other refs, including component.$$ (but need to
                // preserve final state?)
                $$.on_destroy = $$.fragment = null;
                $$.ctx = [];
            }
        }
        function make_dirty(component, i) {
            if (component.$$.dirty[0] === -1) {
                dirty_components.push(component);
                schedule_update();
                component.$$.dirty.fill(0);
            }
            component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
        }
        function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
            const parent_component = current_component;
            set_current_component(component);
            const $$ = component.$$ = {
                fragment: null,
                ctx: null,
                // state
                props,
                update: noop,
                not_equal,
                bound: blank_object(),
                // lifecycle
                on_mount: [],
                on_destroy: [],
                on_disconnect: [],
                before_update: [],
                after_update: [],
                context: new Map(parent_component ? parent_component.$$.context : options.context || []),
                // everything else
                callbacks: blank_object(),
                dirty,
                skip_bound: false
            };
            let ready = false;
            $$.ctx = instance
                ? instance(component, options.props || {}, (i, ret, ...rest) => {
                    const value = rest.length ? rest[0] : ret;
                    if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                        if (!$$.skip_bound && $$.bound[i])
                            $$.bound[i](value);
                        if (ready)
                            make_dirty(component, i);
                    }
                    return ret;
                })
                : [];
            $$.update();
            ready = true;
            run_all($$.before_update);
            // `false` as a special case of no DOM component
            $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
            if (options.target) {
                if (options.hydrate) {
                    const nodes = children(options.target);
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    $$.fragment && $$.fragment.l(nodes);
                    nodes.forEach(detach);
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    $$.fragment && $$.fragment.c();
                }
                if (options.intro)
                    transition_in(component.$$.fragment);
                mount_component(component, options.target, options.anchor, options.customElement);
                flush();
            }
            set_current_component(parent_component);
        }
        /**
         * Base class for Svelte components. Used when dev=false.
         */
        class SvelteComponent {
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                callbacks.push(callback);
                return () => {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1)
                        callbacks.splice(index, 1);
                };
            }
            $set($$props) {
                if (this.$$set && !is_empty($$props)) {
                    this.$$.skip_bound = true;
                    this.$$set($$props);
                    this.$$.skip_bound = false;
                }
            }
        }

        /* src/NumberSpinner.svelte generated by Svelte v3.38.2 */

        const { document: document_1 } = globals;

        function add_css() {
        	var style = element("style");
        	style.id = "svelte-xg45mw-style";
        	style.textContent = ".default.svelte-xg45mw{display:inline-block;box-sizing:border-box;font-variant-numeric:tabular-nums;background-color:white;color:black;width:4em;height:1.6em;margin:0px;padding:0.25em;border:0.075em solid #0004;border-radius:0.15em;text-align:right;vertical-align:baseline;cursor:ew-resize}.default.svelte-xg45mw:focus{border:0.075em solid #06f;outline:none}.default.fast.svelte-xg45mw{border-top-width:0.15em;padding-top:0.175em}.default.slow.svelte-xg45mw{border-bottom-width:0.15em;padding-bottom:0.175em}.default.dragging.svelte-xg45mw{border-color:#04c}.default.editing.svelte-xg45mw{cursor:initial}.drag.svelte-xg45mw{user-select:none}.drag.svelte-xg45mw::selection{background:#0000}.inactive.svelte-xg45mw{display:none !important}";
        	append(document_1.head, style);
        }

        function create_fragment(ctx) {
        	let input0;
        	let input0_class_value;
        	let t;
        	let input1;
        	let input1_class_value;
        	let input1_inputmode_value;
        	let mounted;
        	let dispose;

        	return {
        		c() {
        			input0 = element("input");
        			t = space();
        			input1 = element("input");
        			attr(input0, "type", "text");
        			attr(input0, "style", /*style*/ ctx[10]);
        			attr(input0, "class", input0_class_value = "" + (null_to_empty(/*$$props*/ ctx[24].class) + " svelte-xg45mw"));
        			input0.readOnly = true;
        			attr(input0, "contenteditable", false);
        			attr(input0, "tabindex", "0");
        			toggle_class(input0, "default", !/*$$props*/ ctx[24].class ? true : false);
        			toggle_class(input0, "drag", true);
        			toggle_class(input0, "dragging", /*dragging*/ ctx[4]);
        			toggle_class(input0, "fast", /*stepFactor*/ ctx[5] > 1 ? "fast" : "");
        			toggle_class(input0, "slow", /*stepFactor*/ ctx[5] < 1 ? "slow" : "");
        			toggle_class(input0, "focus", /*dragFocussed*/ ctx[2]);
        			toggle_class(input0, "inactive", /*editing*/ ctx[6]);
        			attr(input1, "style", /*style*/ ctx[10]);
        			attr(input1, "class", input1_class_value = "" + (null_to_empty(/*$$props*/ ctx[24].class) + " svelte-xg45mw"));
        			attr(input1, "type", "text");

        			attr(input1, "inputmode", input1_inputmode_value = isInteger(/*step*/ ctx[1]) && isInteger(/*min*/ ctx[0]) && /*min*/ ctx[0] >= 0
        			? "numeric"
        			: "text");

        			toggle_class(input1, "default", !/*$$props*/ ctx[24].class ? true : false);
        			toggle_class(input1, "edit", true);
        			toggle_class(input1, "editing", /*editing*/ ctx[6]);
        			toggle_class(input1, "focus", /*editFocussed*/ ctx[3]);
        			toggle_class(input1, "inactive", !/*editing*/ ctx[6]);
        		},
        		m(target, anchor) {
        			insert(target, input0, anchor);
        			/*input0_binding*/ ctx[57](input0);
        			set_input_value(input0, /*visibleValue*/ ctx[7]);
        			insert(target, t, anchor);
        			insert(target, input1, anchor);
        			/*input1_binding*/ ctx[59](input1);
        			set_input_value(input1, /*visibleValue*/ ctx[7]);

        			if (!mounted) {
        				dispose = [
        					listen(window, "mousemove", function () {
        						if (is_function(/*dragging*/ ctx[4] ? /*dragmoveHandler*/ ctx[14] : "")) (/*dragging*/ ctx[4] ? /*dragmoveHandler*/ ctx[14] : "").apply(this, arguments);
        					}),
        					listen(window, "touchmove", function () {
        						if (is_function(/*dragging*/ ctx[4] ? /*touchmoveHandler*/ ctx[13] : "")) (/*dragging*/ ctx[4] ? /*touchmoveHandler*/ ctx[13] : "").apply(this, arguments);
        					}),
        					listen(window, "mouseup", stop_propagation(function () {
        						if (is_function(/*dragging*/ ctx[4]
        						? /*mouseupHandler*/ ctx[16]
        						: /*editBlurHandler*/ ctx[20])) (/*dragging*/ ctx[4]
        						? /*mouseupHandler*/ ctx[16]
        						: /*editBlurHandler*/ ctx[20]).apply(this, arguments);
        					})),
        					listen(window, "touchend", stop_propagation(function () {
        						if (is_function(/*dragging*/ ctx[4]
        						? /*touchendHandler*/ ctx[15]
        						: /*editBlurHandler*/ ctx[20])) (/*dragging*/ ctx[4]
        						? /*touchendHandler*/ ctx[15]
        						: /*editBlurHandler*/ ctx[20]).apply(this, arguments);
        					})),
        					listen(window, "keydown", /*keydownHandler*/ ctx[21]),
        					listen(window, "keyup", /*keyupHandler*/ ctx[22]),
        					listen(input0, "mousedown", stop_propagation(/*dragstartHandler*/ ctx[12])),
        					listen(input0, "touchstart", stop_propagation(prevent_default(/*touchstartHandler*/ ctx[11]))),
        					listen(input0, "dblclick", stop_propagation(dblclickHandler)),
        					listen(input0, "focus", /*dragFocusHandler*/ ctx[17]),
        					listen(input0, "blur", /*dragBlurHandler*/ ctx[18]),
        					listen(input0, "keydown", /*keydown_handler*/ ctx[54]),
        					listen(input0, "keypress", /*keypress_handler*/ ctx[55]),
        					listen(input0, "keyup", /*keyup_handler*/ ctx[56]),
        					listen(input0, "input", /*input0_input_handler*/ ctx[58]),
        					listen(input1, "mouseup", stop_propagation(mouseup_handler)),
        					listen(input1, "touchend", stop_propagation(touchend_handler)),
        					listen(input1, "focus", /*editFocusHandler*/ ctx[19]),
        					listen(input1, "blur", /*editBlurHandler*/ ctx[20]),
        					listen(input1, "input", /*inputHandler*/ ctx[23]),
        					listen(input1, "keydown", /*keydown_handler_1*/ ctx[51]),
        					listen(input1, "keypress", /*keypress_handler_1*/ ctx[52]),
        					listen(input1, "keyup", /*keyup_handler_1*/ ctx[53]),
        					listen(input1, "input", /*input1_input_handler*/ ctx[60])
        				];

        				mounted = true;
        			}
        		},
        		p(new_ctx, dirty) {
        			ctx = new_ctx;

        			if (dirty[0] & /*style*/ 1024) {
        				attr(input0, "style", /*style*/ ctx[10]);
        			}

        			if (dirty[0] & /*$$props*/ 16777216 && input0_class_value !== (input0_class_value = "" + (null_to_empty(/*$$props*/ ctx[24].class) + " svelte-xg45mw"))) {
        				attr(input0, "class", input0_class_value);
        			}

        			if (dirty[0] & /*visibleValue*/ 128 && input0.value !== /*visibleValue*/ ctx[7]) {
        				set_input_value(input0, /*visibleValue*/ ctx[7]);
        			}

        			if (dirty[0] & /*$$props, $$props*/ 16777216) {
        				toggle_class(input0, "default", !/*$$props*/ ctx[24].class ? true : false);
        			}

        			if (dirty[0] & /*$$props*/ 16777216) {
        				toggle_class(input0, "drag", true);
        			}

        			if (dirty[0] & /*$$props, dragging*/ 16777232) {
        				toggle_class(input0, "dragging", /*dragging*/ ctx[4]);
        			}

        			if (dirty[0] & /*$$props, stepFactor*/ 16777248) {
        				toggle_class(input0, "fast", /*stepFactor*/ ctx[5] > 1 ? "fast" : "");
        			}

        			if (dirty[0] & /*$$props, stepFactor*/ 16777248) {
        				toggle_class(input0, "slow", /*stepFactor*/ ctx[5] < 1 ? "slow" : "");
        			}

        			if (dirty[0] & /*$$props, dragFocussed*/ 16777220) {
        				toggle_class(input0, "focus", /*dragFocussed*/ ctx[2]);
        			}

        			if (dirty[0] & /*$$props, editing*/ 16777280) {
        				toggle_class(input0, "inactive", /*editing*/ ctx[6]);
        			}

        			if (dirty[0] & /*style*/ 1024) {
        				attr(input1, "style", /*style*/ ctx[10]);
        			}

        			if (dirty[0] & /*$$props*/ 16777216 && input1_class_value !== (input1_class_value = "" + (null_to_empty(/*$$props*/ ctx[24].class) + " svelte-xg45mw"))) {
        				attr(input1, "class", input1_class_value);
        			}

        			if (dirty[0] & /*step, min*/ 3 && input1_inputmode_value !== (input1_inputmode_value = isInteger(/*step*/ ctx[1]) && isInteger(/*min*/ ctx[0]) && /*min*/ ctx[0] >= 0
        			? "numeric"
        			: "text")) {
        				attr(input1, "inputmode", input1_inputmode_value);
        			}

        			if (dirty[0] & /*visibleValue*/ 128 && input1.value !== /*visibleValue*/ ctx[7]) {
        				set_input_value(input1, /*visibleValue*/ ctx[7]);
        			}

        			if (dirty[0] & /*$$props, $$props*/ 16777216) {
        				toggle_class(input1, "default", !/*$$props*/ ctx[24].class ? true : false);
        			}

        			if (dirty[0] & /*$$props*/ 16777216) {
        				toggle_class(input1, "edit", true);
        			}

        			if (dirty[0] & /*$$props, editing*/ 16777280) {
        				toggle_class(input1, "editing", /*editing*/ ctx[6]);
        			}

        			if (dirty[0] & /*$$props, editFocussed*/ 16777224) {
        				toggle_class(input1, "focus", /*editFocussed*/ ctx[3]);
        			}

        			if (dirty[0] & /*$$props, editing*/ 16777280) {
        				toggle_class(input1, "inactive", !/*editing*/ ctx[6]);
        			}
        		},
        		i: noop,
        		o: noop,
        		d(detaching) {
        			if (detaching) detach(input0);
        			/*input0_binding*/ ctx[57](null);
        			if (detaching) detach(t);
        			if (detaching) detach(input1);
        			/*input1_binding*/ ctx[59](null);
        			mounted = false;
        			run_all(dispose);
        		}
        	};
        }

        function dblclickHandler(ev) {
        	
        } // dispatch("consoleLog", ev.type);
        // startEditing();

        // Helpers ----------------------------------------------------------
        function isInteger(num) {
        	return num == Math.round(num);
        }

        const mouseup_handler = ev => {
        	
        };

        const touchend_handler = ev => {
        	
        };

        function instance($$self, $$props, $$invalidate) {
        	const dispatch = createEventDispatcher();
        	let { options = {} } = $$props;
        	let { value = options.value ?? 0 } = $$props;
        	value = parseFloat(value);
        	let { min = options.min ?? -1000000000000 } = $$props;
        	min = parseFloat(min);
        	let { max = options.max ?? 1000000000000 } = $$props;
        	max = parseFloat(max);
        	let { step = options.step ?? 1 } = $$props;
        	step = parseFloat(step);
        	let { precision = options.precision ?? step } = $$props;
        	precision = parseFloat(precision);
        	let { speed = options.speed ?? 1 } = $$props;
        	speed = parseFloat(speed);
        	let { keyStep = options.keyStep ?? step * 10 } = $$props;
        	keyStep = parseFloat(keyStep);
        	let { keyStepSlow = options.keyStepSlow ?? step } = $$props;
        	keyStepSlow = parseFloat(keyStepSlow);
        	let { keyStepFast = options.keyStepFast ?? step * 100 } = $$props;
        	keyStepFast = parseFloat(keyStepFast);
        	let { decimals = options.decimals ?? 0 } = $$props;
        	decimals = parseFloat(decimals);
        	let { format = options.format ?? undefined } = $$props;
        	let { parse = options.parse ?? undefined } = $$props;
        	let { horizontal = options.horizontal ?? true } = $$props;
        	let { vertical = options.vertical ?? false } = $$props;
        	let { circular = options.circular ?? false } = $$props;
        	let { mainStyle = options.mainStyle ?? undefined } = $$props;
        	let { fastStyle = options.fastStyle ?? undefined } = $$props;
        	let { slowStyle = options.slowStyle ?? undefined } = $$props;
        	let { focusStyle = options.focusStyle ?? undefined } = $$props;
        	let { draggingStyle = options.draggingStyle ?? undefined } = $$props;
        	let { editingStyle = options.editingStyle ?? undefined } = $$props;
        	let { cursor = options.cursor ?? undefined } = $$props;
        	let preciseValue;
        	let visibleValue;
        	let isTouchDevice = false;
        	let dragElement, editElement;
        	let dragFocussed = false;
        	let editFocussed = false;
        	let dragging = false;
        	let wasActiveOnClick, hasMoved, clickX, clickY;
        	let stepFactor = 1;
        	let altPressed = false;
        	let shiftPressed = false;
        	let editing = false;
        	let style;
        	let htmlNode = null;
        	let htmlNodeOriginalCursor = null;
        	let defaultCursor;

        	onMount(() => {
        		$$invalidate(48, htmlNode = document.querySelector("html"));
        		$$invalidate(49, htmlNodeOriginalCursor = htmlNode.style.cursor);
        	});

        	// update all values (preciseValue, visibleValue)
        	updateValues(value);

        	function touchstartHandler(ev) {
        		dispatch("consoleLog", ev.type);
        		isTouchDevice = true;
        		dragstartHandler(ev);
        	}

        	function dragstartHandler(ev) {
        		dispatch("consoleLog", ev.type);
        		wasActiveOnClick = document.activeElement === dragElement;
        		$$invalidate(4, dragging = true);
        		dragElement.focus();
        		hasMoved = 0;
        		clickX = isTouchDevice ? ev.touches[0].clientX : ev.clientX;
        		clickY = isTouchDevice ? ev.touches[0].clientY : ev.clientY;
        		$$invalidate(4, dragging = true);
        		updateValues(value);
        	}

        	function touchmoveHandler(ev) {
        		// dispatch('consoleLog', ev.type);
        		isTouchDevice = true;

        		dragmoveHandler(ev);
        	}

        	function dragmoveHandler(ev) {
        		// dispatch('consoleLog', ev.type);
        		// ev.preventDefault();
        		let actX = isTouchDevice ? ev.touches[0].clientX : ev.clientX;

        		let actY = isTouchDevice ? ev.touches[0].clientY : ev.clientY;
        		let distX = horizontal ? actX - clickX : 0;
        		let distY = vertical ? -(actY - clickY) : 0;
        		let stepNum = Math.abs(distX) > Math.abs(distY) ? distX : distY;
        		stepValue(stepNum * stepFactor);
        		clickX = actX;
        		clickY = actY;
        		hasMoved++;
        	}

        	function touchendHandler(ev) {
        		dispatch("consoleLog", ev.type);
        		mouseupHandler(ev);
        	}

        	function mouseupHandler(ev) {
        		dispatch("consoleLog", ev.type);
        		$$invalidate(4, dragging = false);

        		// start editing only if element was already focussed on mousedown and not much dragging was done
        		if (wasActiveOnClick && hasMoved < 2) {
        			startEditing();
        		}
        	}

        	function dragFocusHandler(ev) {
        		dispatch("consoleLog", ev.type);
        		$$invalidate(2, dragFocussed = true);
        	}

        	function dragBlurHandler(ev) {
        		dispatch("consoleLog", ev.type);
        		$$invalidate(2, dragFocussed = false);
        	}

        	function editFocusHandler(ev) {
        		dispatch("consoleLog", ev.type);
        		$$invalidate(3, editFocussed = true);
        	}

        	async function editBlurHandler(ev) {
        		dispatch("consoleLog", ev.type);
        		stopEditing();
        	}

        	function keydownHandler(ev) {
        		if (ev.target == dragElement || ev.target == editElement) {
        			dispatch("consoleLog", ev.type);
        		} // console.log(ev);

        		if (ev.key == "Shift") {
        			$$invalidate(47, shiftPressed = true);
        		}

        		if (ev.key == "Alt") {
        			$$invalidate(46, altPressed = true);
        		}
        	}

        	function keyupHandler(ev) {
        		if (ev.target == dragElement || ev.target == editElement) {
        			dispatch("consoleLog", ev.type);
        		} // console.log(ev);

        		if (ev.key == "Shift") {
        			$$invalidate(47, shiftPressed = false);
        		}

        		if (ev.key == "Alt") {
        			$$invalidate(46, altPressed = false);
        		}

        		if (dragFocussed && !editing) {
        			let increment = keyStep;
        			if (stepFactor < 1) increment = keyStepSlow;
        			if (stepFactor > 1) increment = keyStepFast;

        			if (ev.key == "ArrowUp" || ev.key == "ArrowRight") {
        				addToValue(increment);
        			}

        			if (ev.key == "ArrowDown" || ev.key == "ArrowLeft") {
        				addToValue(-increment);
        			}

        			if (ev.key == "Enter") {
        				startEditing();
        			}
        		} else if (editFocussed && editing) {
        			if (ev.key == "Enter" || ev.key == "Escape") {
        				stopEditing();
        			}
        		}
        	}

        	function inputHandler(ev) {
        		// dispatch("consoleLog", ev.type);
        		// console.log(e);
        		let checkValue = parseFloat(editElement.value);

        		if (!isNaN(checkValue)) {
        			preciseValue = checkValue;
        			preciseValue = keepInRange(preciseValue);

        			// console.log("dispatch input: ", preciseValue)
        			dispatch("input", parseFloat(roundToPrecision(preciseValue)));
        		}
        	}

        	async function startEditing() {
        		$$invalidate(6, editing = true);

        		//preciseValue = parseFloat(visibleValue);
        		await tick();

        		editElement.focus();
        		editElement.select();
        		dispatch("editstart");
        	}

        	function stopEditing() {
        		$$invalidate(3, editFocussed = false);
        		$$invalidate(6, editing = false);

        		if (parse) {
        			preciseValue = parse(visibleValue);
        			updateValues(preciseValue);
        		} else {
        			let checkValue = parseFloat(editElement.value);

        			if (!isNaN(checkValue)) {
        				preciseValue = parseFloat(visibleValue);
        				updateValues(preciseValue);
        			}
        		}

        		dispatch("editend");
        	}

        	function stepValue(numSteps) {
        		preciseValue = preciseValue ?? parseFloat(visibleValue);
        		preciseValue += numSteps * step * speed;
        		updateValues(preciseValue);
        	}

        	function addToValue(increment) {
        		preciseValue = preciseValue ?? parseFloat(visibleValue);
        		preciseValue += increment;
        		updateValues(preciseValue);
        	}

        	function updateValues(val) {
        		preciseValue = parseFloat(val);
        		preciseValue = keepInRange(preciseValue);
        		$$invalidate(7, visibleValue = Math.round((preciseValue - min) / step) * step + min);

        		if (format) {
        			$$invalidate(7, visibleValue = format(visibleValue));
        		} else {
        			$$invalidate(7, visibleValue = visibleValue.toFixed(decimals));
        		}

        		$$invalidate(25, value = roundToPrecision(preciseValue));
        		dispatch("input", parseFloat(value));
        		dispatch("change", parseFloat(value));
        	}

        	function keepInRange(val) {
        		$$invalidate(0, min = parseFloat(min));
        		$$invalidate(26, max = parseFloat(max));

        		if (circular) {
        			let range = max - min;
        			if (range === 0) return min;
        			let fac = val < min ? Math.ceil((min - val) / range) : 0;
        			val = (val - min + range * fac) % range + min;
        		} else {
        			val = Math.min(Math.max(val, min), max);
        		}

        		return val;
        	}

        	function roundToPrecision(val) {
        		let frac;
        		val = Math.round((parseFloat(val) - min) / precision) * precision + min;

        		// number of decimals comes either from the precision prop ...
        		let dec = precision < 1 ? Math.ceil(-Math.log10(precision)) : 0;

        		// ... or from the number of decimals of the step value
        		frac = step.toString().split(".")[1];

        		if (frac) dec = Math.max(dec, frac.length);

        		// ... or from the number of decimals of the min value
        		frac = min.toString().split(".")[1];

        		if (frac) dec = Math.max(dec, frac.length);
        		return parseFloat(val.toFixed(dec));
        	}

        	function keydown_handler_1(event) {
        		bubble($$self, event);
        	}

        	function keypress_handler_1(event) {
        		bubble($$self, event);
        	}

        	function keyup_handler_1(event) {
        		bubble($$self, event);
        	}

        	function keydown_handler(event) {
        		bubble($$self, event);
        	}

        	function keypress_handler(event) {
        		bubble($$self, event);
        	}

        	function keyup_handler(event) {
        		bubble($$self, event);
        	}

        	function input0_binding($$value) {
        		binding_callbacks[$$value ? "unshift" : "push"](() => {
        			dragElement = $$value;
        			$$invalidate(8, dragElement);
        		});
        	}

        	function input0_input_handler() {
        		visibleValue = this.value;
        		$$invalidate(7, visibleValue);
        	}

        	function input1_binding($$value) {
        		binding_callbacks[$$value ? "unshift" : "push"](() => {
        			editElement = $$value;
        			$$invalidate(9, editElement);
        		});
        	}

        	function input1_input_handler() {
        		visibleValue = this.value;
        		$$invalidate(7, visibleValue);
        	}

        	$$self.$$set = $$new_props => {
        		$$invalidate(24, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
        		if ("options" in $$new_props) $$invalidate(33, options = $$new_props.options);
        		if ("value" in $$new_props) $$invalidate(25, value = $$new_props.value);
        		if ("min" in $$new_props) $$invalidate(0, min = $$new_props.min);
        		if ("max" in $$new_props) $$invalidate(26, max = $$new_props.max);
        		if ("step" in $$new_props) $$invalidate(1, step = $$new_props.step);
        		if ("precision" in $$new_props) $$invalidate(27, precision = $$new_props.precision);
        		if ("speed" in $$new_props) $$invalidate(28, speed = $$new_props.speed);
        		if ("keyStep" in $$new_props) $$invalidate(29, keyStep = $$new_props.keyStep);
        		if ("keyStepSlow" in $$new_props) $$invalidate(30, keyStepSlow = $$new_props.keyStepSlow);
        		if ("keyStepFast" in $$new_props) $$invalidate(31, keyStepFast = $$new_props.keyStepFast);
        		if ("decimals" in $$new_props) $$invalidate(32, decimals = $$new_props.decimals);
        		if ("format" in $$new_props) $$invalidate(34, format = $$new_props.format);
        		if ("parse" in $$new_props) $$invalidate(35, parse = $$new_props.parse);
        		if ("horizontal" in $$new_props) $$invalidate(36, horizontal = $$new_props.horizontal);
        		if ("vertical" in $$new_props) $$invalidate(37, vertical = $$new_props.vertical);
        		if ("circular" in $$new_props) $$invalidate(38, circular = $$new_props.circular);
        		if ("mainStyle" in $$new_props) $$invalidate(39, mainStyle = $$new_props.mainStyle);
        		if ("fastStyle" in $$new_props) $$invalidate(40, fastStyle = $$new_props.fastStyle);
        		if ("slowStyle" in $$new_props) $$invalidate(41, slowStyle = $$new_props.slowStyle);
        		if ("focusStyle" in $$new_props) $$invalidate(42, focusStyle = $$new_props.focusStyle);
        		if ("draggingStyle" in $$new_props) $$invalidate(43, draggingStyle = $$new_props.draggingStyle);
        		if ("editingStyle" in $$new_props) $$invalidate(44, editingStyle = $$new_props.editingStyle);
        		if ("cursor" in $$new_props) $$invalidate(45, cursor = $$new_props.cursor);
        	};

        	$$self.$$.update = () => {
        		if ($$self.$$.dirty[0] & /*editing, dragging, value*/ 33554512) {
        			// updaters --------------------------------
        			{
        				if (!editing && !dragging) {
        					updateValues(value);
        				}
        			}
        		}

        		if ($$self.$$.dirty[0] & /*dragFocussed, editing*/ 68 | $$self.$$.dirty[1] & /*altPressed, shiftPressed*/ 98304) {
        			{
        				$$invalidate(5, stepFactor = 1);

        				if (dragFocussed && !editing) {
        					if (altPressed && shiftPressed) {
        						$$invalidate(5, stepFactor = 10);
        					} else if (altPressed) {
        						$$invalidate(5, stepFactor = 0.1);
        					}
        				}
        			}
        		}

        		if ($$self.$$.dirty[0] & /*dragging*/ 16 | $$self.$$.dirty[1] & /*horizontal, vertical, htmlNode, cursor, defaultCursor, htmlNodeOriginalCursor*/ 933984) {
        			{
        				// let cursorClass = horizontal
        				//   ? vertical
        				//     ? 'move-cursor'
        				//     : 'horizontal-cursor'
        				//   : 'vertical-cursor';
        				$$invalidate(50, defaultCursor = horizontal
        				? vertical ? "move" : "ew-resize"
        				: "ns-resize");

        				if (htmlNode) {
        					if (dragging) {
        						$$invalidate(48, htmlNode.style.cursor = cursor ?? defaultCursor, htmlNode);
        					} else {
        						$$invalidate(48, htmlNode.style.cursor = htmlNodeOriginalCursor, htmlNode); // addClass(htmlNode, cursorClass);
        					} // removeClass(htmlNode, cursorClass);
        				}
        			}
        		}

        		if ($$self.$$.dirty[0] & /*style, dragFocussed, editFocussed, editing, stepFactor, dragging*/ 1148 | $$self.$$.dirty[1] & /*mainStyle, focusStyle, fastStyle, slowStyle, draggingStyle, editingStyle, cursor, defaultCursor*/ 556800) {
        			{
        				$$invalidate(10, style = mainStyle ?? "");

        				$$invalidate(10, style += (dragFocussed || editFocussed) && focusStyle
        				? ";" + focusStyle
        				: "");

        				$$invalidate(10, style += !editing && stepFactor > 1 && fastStyle
        				? ";" + fastStyle
        				: "");

        				$$invalidate(10, style += !editing && stepFactor < 1 && slowStyle
        				? ";" + slowStyle
        				: "");

        				$$invalidate(10, style += dragging && draggingStyle ? ";" + draggingStyle : "");
        				$$invalidate(10, style += editing && editingStyle ? ";" + editingStyle : "");
        				$$invalidate(10, style += !editing ? ";cursor:" + (cursor ?? defaultCursor) : "");
        			}
        		}
        	};

        	$$props = exclude_internal_props($$props);

        	return [
        		min,
        		step,
        		dragFocussed,
        		editFocussed,
        		dragging,
        		stepFactor,
        		editing,
        		visibleValue,
        		dragElement,
        		editElement,
        		style,
        		touchstartHandler,
        		dragstartHandler,
        		touchmoveHandler,
        		dragmoveHandler,
        		touchendHandler,
        		mouseupHandler,
        		dragFocusHandler,
        		dragBlurHandler,
        		editFocusHandler,
        		editBlurHandler,
        		keydownHandler,
        		keyupHandler,
        		inputHandler,
        		$$props,
        		value,
        		max,
        		precision,
        		speed,
        		keyStep,
        		keyStepSlow,
        		keyStepFast,
        		decimals,
        		options,
        		format,
        		parse,
        		horizontal,
        		vertical,
        		circular,
        		mainStyle,
        		fastStyle,
        		slowStyle,
        		focusStyle,
        		draggingStyle,
        		editingStyle,
        		cursor,
        		altPressed,
        		shiftPressed,
        		htmlNode,
        		htmlNodeOriginalCursor,
        		defaultCursor,
        		keydown_handler_1,
        		keypress_handler_1,
        		keyup_handler_1,
        		keydown_handler,
        		keypress_handler,
        		keyup_handler,
        		input0_binding,
        		input0_input_handler,
        		input1_binding,
        		input1_input_handler
        	];
        }

        class NumberSpinner extends SvelteComponent {
        	constructor(options) {
        		super();
        		if (!document_1.getElementById("svelte-xg45mw-style")) add_css();

        		init(
        			this,
        			options,
        			instance,
        			create_fragment,
        			safe_not_equal,
        			{
        				options: 33,
        				value: 25,
        				min: 0,
        				max: 26,
        				step: 1,
        				precision: 27,
        				speed: 28,
        				keyStep: 29,
        				keyStepSlow: 30,
        				keyStepFast: 31,
        				decimals: 32,
        				format: 34,
        				parse: 35,
        				horizontal: 36,
        				vertical: 37,
        				circular: 38,
        				mainStyle: 39,
        				fastStyle: 40,
        				slowStyle: 41,
        				focusStyle: 42,
        				draggingStyle: 43,
        				editingStyle: 44,
        				cursor: 45
        			},
        			[-1, -1, -1]
        		);
        	}
        }

        return NumberSpinner;

    })));
    });

    /* example/src/App.svelte generated by Svelte v3.38.2 */

    const { console: console_1 } = globals;
    const file = "example/src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h2;
    	let t1;
    	let p;
    	let t2;
    	let i0;
    	let t4;
    	let i1;
    	let t6;
    	let t7;
    	let hr0;
    	let t8;
    	let div2;
    	let div0;
    	let t9;
    	let br0;
    	let t10;
    	let t11;
    	let t12;
    	let div1;
    	let numberspinner0;
    	let updating_value;
    	let t13;
    	let hr1;
    	let t14;
    	let div5;
    	let div3;
    	let t15;
    	let br1;
    	let t16;
    	let t17;
    	let t18;
    	let div4;
    	let numberspinner1;
    	let updating_value_1;
    	let t19;
    	let hr2;
    	let t20;
    	let div8;
    	let div6;
    	let t21;
    	let br2;
    	let t22;
    	let t23;
    	let t24;
    	let div7;
    	let numberspinner2;
    	let updating_value_2;
    	let t25;
    	let hr3;
    	let t26;
    	let div11;
    	let div9;
    	let t27;
    	let br3;
    	let t28;
    	let t29;
    	let t30;
    	let div10;
    	let numberspinner3;
    	let updating_value_3;
    	let t31;
    	let hr4;
    	let t32;
    	let div14;
    	let div12;
    	let t33;
    	let br4;
    	let t34;
    	let t35;
    	let t36;
    	let div13;
    	let numberspinner4;
    	let updating_value_4;
    	let t37;
    	let hr5;
    	let t38;
    	let div17;
    	let div15;
    	let t39;
    	let br5;
    	let t40;
    	let t41;
    	let br6;
    	let t42;
    	let t43;
    	let br7;
    	let t44;
    	let t45;
    	let t46;
    	let t47;
    	let t48;
    	let div16;
    	let numberspinner5;
    	let t49;
    	let hr6;
    	let t50;
    	let div22;
    	let div18;
    	let t51;
    	let br8;
    	let t52;
    	let t53;
    	let br9;
    	let t54;
    	let div19;
    	let button0;
    	let t56;
    	let div20;
    	let numberspinner6;
    	let updating_value_5;
    	let t57;
    	let div21;
    	let button1;
    	let t59;
    	let hr7;
    	let t60;
    	let div25;
    	let div23;
    	let t61;
    	let br10;
    	let t62;
    	let t63_value = `{ min: -5.5, max: 5.5, step: 1, keyStep: 1, keyStepFast: 2, decimals: 1, speed: 0.04 }` + "";
    	let t63;
    	let br11;
    	let t64;
    	let t65;
    	let t66;
    	let div24;
    	let numberspinner7;
    	let updating_value_6;
    	let t67;
    	let hr8;
    	let t68;
    	let div28;
    	let div26;
    	let t69;
    	let br12;
    	let t70;
    	let t71;
    	let t72;
    	let div27;
    	let numberspinner8;
    	let updating_value_7;
    	let t73;
    	let hr9;
    	let t74;
    	let div31;
    	let div29;
    	let t75;
    	let br13;
    	let t76;
    	let t77;
    	let t78;
    	let div30;
    	let numberspinner9;
    	let updating_value_8;
    	let t79;
    	let hr10;
    	let t80;
    	let div34;
    	let div32;
    	let t81;
    	let br14;
    	let t82;
    	let t83;
    	let t84;
    	let div33;
    	let numberspinner10;
    	let updating_value_9;
    	let t85;
    	let hr11;
    	let current;
    	let mounted;
    	let dispose;

    	function numberspinner0_value_binding(value) {
    		/*numberspinner0_value_binding*/ ctx[16](value);
    	}

    	let numberspinner0_props = {};

    	if (/*value1*/ ctx[0] !== void 0) {
    		numberspinner0_props.value = /*value1*/ ctx[0];
    	}

    	numberspinner0 = new dist({
    			props: numberspinner0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner0, "value", numberspinner0_value_binding));

    	function numberspinner1_value_binding(value) {
    		/*numberspinner1_value_binding*/ ctx[17](value);
    	}

    	let numberspinner1_props = {
    		min: "0",
    		max: "360",
    		vertical: true,
    		circular: true
    	};

    	if (/*value2*/ ctx[1] !== void 0) {
    		numberspinner1_props.value = /*value2*/ ctx[1];
    	}

    	numberspinner1 = new dist({
    			props: numberspinner1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner1, "value", numberspinner1_value_binding));

    	function numberspinner2_value_binding(value) {
    		/*numberspinner2_value_binding*/ ctx[18](value);
    	}

    	let numberspinner2_props = {
    		min: "-5",
    		max: "5",
    		step: "0.01",
    		decimals: "2",
    		precision: "0.001",
    		editOnClick: true
    	};

    	if (/*value3*/ ctx[2] !== void 0) {
    		numberspinner2_props.value = /*value3*/ ctx[2];
    	}

    	numberspinner2 = new dist({
    			props: numberspinner2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner2, "value", numberspinner2_value_binding));

    	function numberspinner3_value_binding(value) {
    		/*numberspinner3_value_binding*/ ctx[19](value);
    	}

    	let numberspinner3_props = {
    		step: "10",
    		mainStyle: "color:#aaa; width:80px; border-radius:20px",
    		focusStyle: "color:#06f",
    		draggingStyle: "border-color:#f00",
    		editingStyle: "color:#00f; background-color:#06f4",
    		fastStyle: "color:#f00",
    		slowStyle: "color:#0c0",
    		cursor: "url(customcursor.png) 16 16, auto"
    	};

    	if (/*value4*/ ctx[3] !== void 0) {
    		numberspinner3_props.value = /*value4*/ ctx[3];
    	}

    	numberspinner3 = new dist({
    			props: numberspinner3_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner3, "value", numberspinner3_value_binding));

    	function numberspinner4_value_binding(value) {
    		/*numberspinner4_value_binding*/ ctx[20](value);
    	}

    	let numberspinner4_props = {
    		min: "0",
    		max: "1",
    		step: "0.001",
    		decimals: "3",
    		class: "number-spinner-custom"
    	};

    	if (/*value5*/ ctx[4] !== void 0) {
    		numberspinner4_props.value = /*value5*/ ctx[4];
    	}

    	numberspinner4 = new dist({
    			props: numberspinner4_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner4, "value", numberspinner4_value_binding));

    	numberspinner5 = new dist({
    			props: {
    				value: /*value6*/ ctx[14],
    				min: "-100",
    				max: "100"
    			},
    			$$inline: true
    		});

    	numberspinner5.$on("change", /*change_handler*/ ctx[21]);
    	numberspinner5.$on("input", /*input_handler*/ ctx[22]);
    	numberspinner5.$on("keyup", /*keyup_handler*/ ctx[23]);
    	numberspinner5.$on("editstart", /*editstart_handler*/ ctx[24]);
    	numberspinner5.$on("editend", /*editend_handler*/ ctx[25]);

    	function numberspinner6_value_binding(value) {
    		/*numberspinner6_value_binding*/ ctx[27](value);
    	}

    	let numberspinner6_props = { min: "0", max: "12", circular: true };

    	if (/*value7*/ ctx[9] !== void 0) {
    		numberspinner6_props.value = /*value7*/ ctx[9];
    	}

    	numberspinner6 = new dist({
    			props: numberspinner6_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner6, "value", numberspinner6_value_binding));

    	function numberspinner7_value_binding(value) {
    		/*numberspinner7_value_binding*/ ctx[29](value);
    	}

    	let numberspinner7_props = { options: /*options*/ ctx[15] };

    	if (/*value8*/ ctx[10] !== void 0) {
    		numberspinner7_props.value = /*value8*/ ctx[10];
    	}

    	numberspinner7 = new dist({
    			props: numberspinner7_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner7, "value", numberspinner7_value_binding));

    	function numberspinner8_value_binding(value) {
    		/*numberspinner8_value_binding*/ ctx[30](value);
    	}

    	let numberspinner8_props = { format: addDollar, parse: removeDollar };

    	if (/*value9*/ ctx[11] !== void 0) {
    		numberspinner8_props.value = /*value9*/ ctx[11];
    	}

    	numberspinner8 = new dist({
    			props: numberspinner8_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner8, "value", numberspinner8_value_binding));

    	function numberspinner9_value_binding(value) {
    		/*numberspinner9_value_binding*/ ctx[31](value);
    	}

    	let numberspinner9_props = {
    		min: 0,
    		max: 1440,
    		keyStep: 15,
    		keyStepSlow: 1,
    		keyStepFast: 60,
    		circular: true,
    		format: formatMinutesToTime,
    		parse: parseTimeToMinutes
    	};

    	if (/*value10*/ ctx[12] !== void 0) {
    		numberspinner9_props.value = /*value10*/ ctx[12];
    	}

    	numberspinner9 = new dist({
    			props: numberspinner9_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner9, "value", numberspinner9_value_binding));

    	function numberspinner10_value_binding(value) {
    		/*numberspinner10_value_binding*/ ctx[34](value);
    	}

    	let numberspinner10_props = {
    		step: 0.01,
    		format: /*func*/ ctx[32],
    		parse: /*func_1*/ ctx[33]
    	};

    	if (/*value11*/ ctx[13] !== void 0) {
    		numberspinner10_props.value = /*value11*/ ctx[13];
    	}

    	numberspinner10 = new dist({
    			props: numberspinner10_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner10, "value", numberspinner10_value_binding));

    	const block = {
    		c: function create() {
    			main = element("main");
    			h2 = element("h2");
    			h2.textContent = "Svelte Number Spinner Example";
    			t1 = space();
    			p = element("p");
    			t2 = text("Change the values of the number spinners through mousedrag and arrow keys. Press ");
    			i0 = element("i");
    			i0.textContent = "Alt";
    			t4 = text(" for\n    smaller steps, ");
    			i1 = element("i");
    			i1.textContent = "Alt+Shift";
    			t6 = text(" for larger steps. Click without dragging to edit.");
    			t7 = space();
    			hr0 = element("hr");
    			t8 = space();
    			div2 = element("div");
    			div0 = element("div");
    			t9 = text("Default: no range limits, step = 1");
    			br0 = element("br");
    			t10 = text("Current value is ");
    			t11 = text(/*value1*/ ctx[0]);
    			t12 = space();
    			div1 = element("div");
    			create_component(numberspinner0.$$.fragment);
    			t13 = space();
    			hr1 = element("hr");
    			t14 = space();
    			div5 = element("div");
    			div3 = element("div");
    			t15 = text("Range: 0 - 360, vertical = true (dragging and arrow keys up/down will also change the value),\n      circular = true ");
    			br1 = element("br");
    			t16 = text("Current value is ");
    			t17 = text(/*value2*/ ctx[1]);
    			t18 = space();
    			div4 = element("div");
    			create_component(numberspinner1.$$.fragment);
    			t19 = space();
    			hr2 = element("hr");
    			t20 = space();
    			div8 = element("div");
    			div6 = element("div");
    			t21 = text("step = 0.01, decimals = 2, precision = 0.001");
    			br2 = element("br");
    			t22 = text("Current value is ");
    			t23 = text(/*value3*/ ctx[2]);
    			t24 = space();
    			div7 = element("div");
    			create_component(numberspinner2.$$.fragment);
    			t25 = space();
    			hr3 = element("hr");
    			t26 = space();
    			div11 = element("div");
    			div9 = element("div");
    			t27 = text("Individual styling using props.");
    			br3 = element("br");
    			t28 = text("Current value is ");
    			t29 = text(/*value4*/ ctx[3]);
    			t30 = space();
    			div10 = element("div");
    			create_component(numberspinner3.$$.fragment);
    			t31 = space();
    			hr4 = element("hr");
    			t32 = space();
    			div14 = element("div");
    			div12 = element("div");
    			t33 = text("Individual styling using custom class.");
    			br4 = element("br");
    			t34 = text("Current value is ");
    			t35 = text(/*value5*/ ctx[4]);
    			t36 = space();
    			div13 = element("div");
    			create_component(numberspinner4.$$.fragment);
    			t37 = space();
    			hr5 = element("hr");
    			t38 = space();
    			div17 = element("div");
    			div15 = element("div");
    			t39 = text("Get value through input and change events.");
    			br5 = element("br");
    			t40 = text("\n      Current input value is ");
    			t41 = text(/*value6input*/ ctx[5]);
    			br6 = element("br");
    			t42 = text("\n      Current change value is ");
    			t43 = text(/*value6change*/ ctx[6]);
    			br7 = element("br");
    			t44 = text("\n      Edit mode is ");
    			t45 = text(/*value6editmode*/ ctx[7]);
    			t46 = text(". Last key pressed: ");
    			t47 = text(/*value6lastkey*/ ctx[8]);
    			t48 = space();
    			div16 = element("div");
    			create_component(numberspinner5.$$.fragment);
    			t49 = space();
    			hr6 = element("hr");
    			t50 = space();
    			div22 = element("div");
    			div18 = element("div");
    			t51 = text("Test correct updating of the value if changed from outside.");
    			br8 = element("br");
    			t52 = text("\n      Current value is ");
    			t53 = text(/*value7*/ ctx[9]);
    			br9 = element("br");
    			t54 = space();
    			div19 = element("div");
    			button0 = element("button");
    			button0.textContent = "–";
    			t56 = space();
    			div20 = element("div");
    			create_component(numberspinner6.$$.fragment);
    			t57 = space();
    			div21 = element("div");
    			button1 = element("button");
    			button1.textContent = "+";
    			t59 = space();
    			hr7 = element("hr");
    			t60 = space();
    			div25 = element("div");
    			div23 = element("div");
    			t61 = text("Giving some of the props by options object.");
    			br10 = element("br");
    			t62 = space();
    			t63 = text(t63_value);
    			br11 = element("br");
    			t64 = text("\n      Current value is ");
    			t65 = text(/*value8*/ ctx[10]);
    			t66 = space();
    			div24 = element("div");
    			create_component(numberspinner7.$$.fragment);
    			t67 = space();
    			hr8 = element("hr");
    			t68 = space();
    			div28 = element("div");
    			div26 = element("div");
    			t69 = text("Using callbacks to format and parse the displayed value as a currency.");
    			br12 = element("br");
    			t70 = text("Current value is ");
    			t71 = text(/*value9*/ ctx[11]);
    			t72 = space();
    			div27 = element("div");
    			create_component(numberspinner8.$$.fragment);
    			t73 = space();
    			hr9 = element("hr");
    			t74 = space();
    			div31 = element("div");
    			div29 = element("div");
    			t75 = text("Using callbacks to format and parse the displayed value as time of day.");
    			br13 = element("br");
    			t76 = text("Current value is ");
    			t77 = text(/*value10*/ ctx[12]);
    			t78 = space();
    			div30 = element("div");
    			create_component(numberspinner9.$$.fragment);
    			t79 = space();
    			hr10 = element("hr");
    			t80 = space();
    			div34 = element("div");
    			div32 = element("div");
    			t81 = text("Using format and parse to implement a exponential/logarithmic scale.");
    			br14 = element("br");
    			t82 = text("Current value is ");
    			t83 = text(/*value11*/ ctx[13]);
    			t84 = space();
    			div33 = element("div");
    			create_component(numberspinner10.$$.fragment);
    			t85 = space();
    			hr11 = element("hr");
    			attr_dev(h2, "class", "svelte-11zku27");
    			add_location(h2, file, 47, 2, 1440);
    			attr_dev(i0, "class", "svelte-11zku27");
    			add_location(i0, file, 50, 85, 1571);
    			attr_dev(i1, "class", "svelte-11zku27");
    			add_location(i1, file, 51, 19, 1605);
    			attr_dev(p, "class", "svelte-11zku27");
    			add_location(p, file, 49, 2, 1482);
    			attr_dev(hr0, "class", "svelte-11zku27");
    			add_location(hr0, file, 54, 2, 1682);
    			attr_dev(br0, "class", "svelte-11zku27");
    			add_location(br0, file, 57, 63, 1773);
    			attr_dev(div0, "class", "explanation svelte-11zku27");
    			add_location(div0, file, 57, 4, 1714);
    			attr_dev(div1, "class", "right svelte-11zku27");
    			add_location(div1, file, 58, 4, 1815);
    			attr_dev(div2, "class", "row svelte-11zku27");
    			add_location(div2, file, 56, 2, 1692);
    			attr_dev(hr1, "class", "svelte-11zku27");
    			add_location(hr1, file, 63, 2, 1902);
    			attr_dev(br1, "class", "svelte-11zku27");
    			add_location(br1, file, 68, 22, 2082);
    			attr_dev(div3, "class", "explanation svelte-11zku27");
    			add_location(div3, file, 66, 4, 1934);
    			attr_dev(div4, "class", "right svelte-11zku27");
    			add_location(div4, file, 70, 4, 2129);
    			attr_dev(div5, "class", "row svelte-11zku27");
    			add_location(div5, file, 65, 2, 1912);
    			attr_dev(hr2, "class", "svelte-11zku27");
    			add_location(hr2, file, 75, 2, 2266);
    			attr_dev(br2, "class", "svelte-11zku27");
    			add_location(br2, file, 79, 50, 2374);
    			attr_dev(div6, "class", "explanation svelte-11zku27");
    			add_location(div6, file, 78, 4, 2298);
    			attr_dev(div7, "class", "right svelte-11zku27");
    			add_location(div7, file, 81, 4, 2421);
    			attr_dev(div8, "class", "row svelte-11zku27");
    			add_location(div8, file, 77, 2, 2276);
    			attr_dev(hr3, "class", "svelte-11zku27");
    			add_location(hr3, file, 94, 2, 2649);
    			attr_dev(br3, "class", "svelte-11zku27");
    			add_location(br3, file, 97, 60, 2737);
    			attr_dev(div9, "class", "explanation svelte-11zku27");
    			add_location(div9, file, 97, 4, 2681);
    			attr_dev(div10, "class", "right svelte-11zku27");
    			add_location(div10, file, 98, 4, 2779);
    			attr_dev(div11, "class", "row svelte-11zku27");
    			add_location(div11, file, 96, 2, 2659);
    			attr_dev(hr4, "class", "svelte-11zku27");
    			add_location(hr4, file, 113, 2, 3206);
    			attr_dev(br4, "class", "svelte-11zku27");
    			add_location(br4, file, 117, 44, 3308);
    			attr_dev(div12, "class", "explanation svelte-11zku27");
    			add_location(div12, file, 116, 4, 3238);
    			attr_dev(div13, "class", "right svelte-11zku27");
    			add_location(div13, file, 119, 4, 3355);
    			attr_dev(div14, "class", "row svelte-11zku27");
    			add_location(div14, file, 115, 2, 3216);
    			attr_dev(hr5, "class", "svelte-11zku27");
    			add_location(hr5, file, 131, 2, 3568);
    			attr_dev(br5, "class", "svelte-11zku27");
    			add_location(br5, file, 135, 48, 3674);
    			attr_dev(br6, "class", "svelte-11zku27");
    			add_location(br6, file, 136, 42, 3723);
    			attr_dev(br7, "class", "svelte-11zku27");
    			add_location(br7, file, 137, 44, 3774);
    			attr_dev(div15, "class", "explanation svelte-11zku27");
    			add_location(div15, file, 134, 4, 3600);
    			attr_dev(div16, "class", "right svelte-11zku27");
    			add_location(div16, file, 140, 4, 3867);
    			attr_dev(div17, "class", "row svelte-11zku27");
    			add_location(div17, file, 133, 2, 3578);
    			attr_dev(hr6, "class", "svelte-11zku27");
    			add_location(hr6, file, 158, 2, 4330);
    			attr_dev(br8, "class", "svelte-11zku27");
    			add_location(br8, file, 162, 65, 4453);
    			attr_dev(br9, "class", "svelte-11zku27");
    			add_location(br9, file, 163, 31, 4491);
    			attr_dev(div18, "class", "explanation svelte-11zku27");
    			add_location(div18, file, 161, 4, 4362);
    			attr_dev(button0, "class", "svelte-11zku27");
    			add_location(button0, file, 166, 6, 4525);
    			attr_dev(div19, "class", "svelte-11zku27");
    			add_location(div19, file, 165, 4, 4513);
    			attr_dev(div20, "class", "right small-margin svelte-11zku27");
    			add_location(div20, file, 172, 4, 4623);
    			attr_dev(button1, "class", "svelte-11zku27");
    			add_location(button1, file, 176, 6, 4760);
    			attr_dev(div21, "class", "svelte-11zku27");
    			add_location(div21, file, 175, 4, 4748);
    			attr_dev(div22, "class", "row svelte-11zku27");
    			add_location(div22, file, 160, 2, 4340);
    			attr_dev(hr7, "class", "svelte-11zku27");
    			add_location(hr7, file, 184, 2, 4866);
    			attr_dev(br10, "class", "svelte-11zku27");
    			add_location(br10, file, 188, 49, 4973);
    			attr_dev(br11, "class", "svelte-11zku27");
    			add_location(br11, file, 189, 96, 5076);
    			attr_dev(div23, "class", "explanation svelte-11zku27");
    			add_location(div23, file, 187, 4, 4898);
    			attr_dev(div24, "class", "right svelte-11zku27");
    			add_location(div24, file, 192, 4, 5130);
    			attr_dev(div25, "class", "row svelte-11zku27");
    			add_location(div25, file, 186, 2, 4876);
    			attr_dev(hr8, "class", "svelte-11zku27");
    			add_location(hr8, file, 197, 2, 5227);
    			attr_dev(br12, "class", "svelte-11zku27");
    			add_location(br12, file, 201, 76, 5361);
    			attr_dev(div26, "class", "explanation svelte-11zku27");
    			add_location(div26, file, 200, 4, 5259);
    			attr_dev(div27, "class", "right svelte-11zku27");
    			add_location(div27, file, 203, 4, 5408);
    			attr_dev(div28, "class", "row svelte-11zku27");
    			add_location(div28, file, 199, 2, 5237);
    			attr_dev(hr9, "class", "svelte-11zku27");
    			add_location(hr9, file, 208, 2, 5534);
    			attr_dev(br13, "class", "svelte-11zku27");
    			add_location(br13, file, 212, 77, 5669);
    			attr_dev(div29, "class", "explanation svelte-11zku27");
    			add_location(div29, file, 211, 4, 5566);
    			attr_dev(div30, "class", "right svelte-11zku27");
    			add_location(div30, file, 214, 4, 5717);
    			attr_dev(div31, "class", "row svelte-11zku27");
    			add_location(div31, file, 210, 2, 5544);
    			attr_dev(hr10, "class", "svelte-11zku27");
    			add_location(hr10, file, 219, 2, 5941);
    			attr_dev(br14, "class", "svelte-11zku27");
    			add_location(br14, file, 223, 74, 6073);
    			attr_dev(div32, "class", "explanation svelte-11zku27");
    			add_location(div32, file, 222, 4, 5973);
    			attr_dev(div33, "class", "right svelte-11zku27");
    			add_location(div33, file, 225, 4, 6121);
    			attr_dev(div34, "class", "row svelte-11zku27");
    			add_location(div34, file, 221, 2, 5951);
    			attr_dev(hr11, "class", "svelte-11zku27");
    			add_location(hr11, file, 233, 2, 6323);
    			attr_dev(main, "class", "svelte-11zku27");
    			add_location(main, file, 46, 0, 1431);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h2);
    			append_dev(main, t1);
    			append_dev(main, p);
    			append_dev(p, t2);
    			append_dev(p, i0);
    			append_dev(p, t4);
    			append_dev(p, i1);
    			append_dev(p, t6);
    			append_dev(main, t7);
    			append_dev(main, hr0);
    			append_dev(main, t8);
    			append_dev(main, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t9);
    			append_dev(div0, br0);
    			append_dev(div0, t10);
    			append_dev(div0, t11);
    			append_dev(div2, t12);
    			append_dev(div2, div1);
    			mount_component(numberspinner0, div1, null);
    			append_dev(main, t13);
    			append_dev(main, hr1);
    			append_dev(main, t14);
    			append_dev(main, div5);
    			append_dev(div5, div3);
    			append_dev(div3, t15);
    			append_dev(div3, br1);
    			append_dev(div3, t16);
    			append_dev(div3, t17);
    			append_dev(div5, t18);
    			append_dev(div5, div4);
    			mount_component(numberspinner1, div4, null);
    			append_dev(main, t19);
    			append_dev(main, hr2);
    			append_dev(main, t20);
    			append_dev(main, div8);
    			append_dev(div8, div6);
    			append_dev(div6, t21);
    			append_dev(div6, br2);
    			append_dev(div6, t22);
    			append_dev(div6, t23);
    			append_dev(div8, t24);
    			append_dev(div8, div7);
    			mount_component(numberspinner2, div7, null);
    			append_dev(main, t25);
    			append_dev(main, hr3);
    			append_dev(main, t26);
    			append_dev(main, div11);
    			append_dev(div11, div9);
    			append_dev(div9, t27);
    			append_dev(div9, br3);
    			append_dev(div9, t28);
    			append_dev(div9, t29);
    			append_dev(div11, t30);
    			append_dev(div11, div10);
    			mount_component(numberspinner3, div10, null);
    			append_dev(main, t31);
    			append_dev(main, hr4);
    			append_dev(main, t32);
    			append_dev(main, div14);
    			append_dev(div14, div12);
    			append_dev(div12, t33);
    			append_dev(div12, br4);
    			append_dev(div12, t34);
    			append_dev(div12, t35);
    			append_dev(div14, t36);
    			append_dev(div14, div13);
    			mount_component(numberspinner4, div13, null);
    			append_dev(main, t37);
    			append_dev(main, hr5);
    			append_dev(main, t38);
    			append_dev(main, div17);
    			append_dev(div17, div15);
    			append_dev(div15, t39);
    			append_dev(div15, br5);
    			append_dev(div15, t40);
    			append_dev(div15, t41);
    			append_dev(div15, br6);
    			append_dev(div15, t42);
    			append_dev(div15, t43);
    			append_dev(div15, br7);
    			append_dev(div15, t44);
    			append_dev(div15, t45);
    			append_dev(div15, t46);
    			append_dev(div15, t47);
    			append_dev(div17, t48);
    			append_dev(div17, div16);
    			mount_component(numberspinner5, div16, null);
    			append_dev(main, t49);
    			append_dev(main, hr6);
    			append_dev(main, t50);
    			append_dev(main, div22);
    			append_dev(div22, div18);
    			append_dev(div18, t51);
    			append_dev(div18, br8);
    			append_dev(div18, t52);
    			append_dev(div18, t53);
    			append_dev(div18, br9);
    			append_dev(div22, t54);
    			append_dev(div22, div19);
    			append_dev(div19, button0);
    			append_dev(div22, t56);
    			append_dev(div22, div20);
    			mount_component(numberspinner6, div20, null);
    			append_dev(div22, t57);
    			append_dev(div22, div21);
    			append_dev(div21, button1);
    			append_dev(main, t59);
    			append_dev(main, hr7);
    			append_dev(main, t60);
    			append_dev(main, div25);
    			append_dev(div25, div23);
    			append_dev(div23, t61);
    			append_dev(div23, br10);
    			append_dev(div23, t62);
    			append_dev(div23, t63);
    			append_dev(div23, br11);
    			append_dev(div23, t64);
    			append_dev(div23, t65);
    			append_dev(div25, t66);
    			append_dev(div25, div24);
    			mount_component(numberspinner7, div24, null);
    			append_dev(main, t67);
    			append_dev(main, hr8);
    			append_dev(main, t68);
    			append_dev(main, div28);
    			append_dev(div28, div26);
    			append_dev(div26, t69);
    			append_dev(div26, br12);
    			append_dev(div26, t70);
    			append_dev(div26, t71);
    			append_dev(div28, t72);
    			append_dev(div28, div27);
    			mount_component(numberspinner8, div27, null);
    			append_dev(main, t73);
    			append_dev(main, hr9);
    			append_dev(main, t74);
    			append_dev(main, div31);
    			append_dev(div31, div29);
    			append_dev(div29, t75);
    			append_dev(div29, br13);
    			append_dev(div29, t76);
    			append_dev(div29, t77);
    			append_dev(div31, t78);
    			append_dev(div31, div30);
    			mount_component(numberspinner9, div30, null);
    			append_dev(main, t79);
    			append_dev(main, hr10);
    			append_dev(main, t80);
    			append_dev(main, div34);
    			append_dev(div34, div32);
    			append_dev(div32, t81);
    			append_dev(div32, br14);
    			append_dev(div32, t82);
    			append_dev(div32, t83);
    			append_dev(div34, t84);
    			append_dev(div34, div33);
    			mount_component(numberspinner10, div33, null);
    			append_dev(main, t85);
    			append_dev(main, hr11);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[26], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[28], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*value1*/ 1) set_data_dev(t11, /*value1*/ ctx[0]);
    			const numberspinner0_changes = {};

    			if (!updating_value && dirty[0] & /*value1*/ 1) {
    				updating_value = true;
    				numberspinner0_changes.value = /*value1*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			numberspinner0.$set(numberspinner0_changes);
    			if (!current || dirty[0] & /*value2*/ 2) set_data_dev(t17, /*value2*/ ctx[1]);
    			const numberspinner1_changes = {};

    			if (!updating_value_1 && dirty[0] & /*value2*/ 2) {
    				updating_value_1 = true;
    				numberspinner1_changes.value = /*value2*/ ctx[1];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			numberspinner1.$set(numberspinner1_changes);
    			if (!current || dirty[0] & /*value3*/ 4) set_data_dev(t23, /*value3*/ ctx[2]);
    			const numberspinner2_changes = {};

    			if (!updating_value_2 && dirty[0] & /*value3*/ 4) {
    				updating_value_2 = true;
    				numberspinner2_changes.value = /*value3*/ ctx[2];
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			numberspinner2.$set(numberspinner2_changes);
    			if (!current || dirty[0] & /*value4*/ 8) set_data_dev(t29, /*value4*/ ctx[3]);
    			const numberspinner3_changes = {};

    			if (!updating_value_3 && dirty[0] & /*value4*/ 8) {
    				updating_value_3 = true;
    				numberspinner3_changes.value = /*value4*/ ctx[3];
    				add_flush_callback(() => updating_value_3 = false);
    			}

    			numberspinner3.$set(numberspinner3_changes);
    			if (!current || dirty[0] & /*value5*/ 16) set_data_dev(t35, /*value5*/ ctx[4]);
    			const numberspinner4_changes = {};

    			if (!updating_value_4 && dirty[0] & /*value5*/ 16) {
    				updating_value_4 = true;
    				numberspinner4_changes.value = /*value5*/ ctx[4];
    				add_flush_callback(() => updating_value_4 = false);
    			}

    			numberspinner4.$set(numberspinner4_changes);
    			if (!current || dirty[0] & /*value6input*/ 32) set_data_dev(t41, /*value6input*/ ctx[5]);
    			if (!current || dirty[0] & /*value6change*/ 64) set_data_dev(t43, /*value6change*/ ctx[6]);
    			if (!current || dirty[0] & /*value6editmode*/ 128) set_data_dev(t45, /*value6editmode*/ ctx[7]);
    			if (!current || dirty[0] & /*value6lastkey*/ 256) set_data_dev(t47, /*value6lastkey*/ ctx[8]);
    			if (!current || dirty[0] & /*value7*/ 512) set_data_dev(t53, /*value7*/ ctx[9]);
    			const numberspinner6_changes = {};

    			if (!updating_value_5 && dirty[0] & /*value7*/ 512) {
    				updating_value_5 = true;
    				numberspinner6_changes.value = /*value7*/ ctx[9];
    				add_flush_callback(() => updating_value_5 = false);
    			}

    			numberspinner6.$set(numberspinner6_changes);
    			if (!current || dirty[0] & /*value8*/ 1024) set_data_dev(t65, /*value8*/ ctx[10]);
    			const numberspinner7_changes = {};

    			if (!updating_value_6 && dirty[0] & /*value8*/ 1024) {
    				updating_value_6 = true;
    				numberspinner7_changes.value = /*value8*/ ctx[10];
    				add_flush_callback(() => updating_value_6 = false);
    			}

    			numberspinner7.$set(numberspinner7_changes);
    			if (!current || dirty[0] & /*value9*/ 2048) set_data_dev(t71, /*value9*/ ctx[11]);
    			const numberspinner8_changes = {};

    			if (!updating_value_7 && dirty[0] & /*value9*/ 2048) {
    				updating_value_7 = true;
    				numberspinner8_changes.value = /*value9*/ ctx[11];
    				add_flush_callback(() => updating_value_7 = false);
    			}

    			numberspinner8.$set(numberspinner8_changes);
    			if (!current || dirty[0] & /*value10*/ 4096) set_data_dev(t77, /*value10*/ ctx[12]);
    			const numberspinner9_changes = {};

    			if (!updating_value_8 && dirty[0] & /*value10*/ 4096) {
    				updating_value_8 = true;
    				numberspinner9_changes.value = /*value10*/ ctx[12];
    				add_flush_callback(() => updating_value_8 = false);
    			}

    			numberspinner9.$set(numberspinner9_changes);
    			if (!current || dirty[0] & /*value11*/ 8192) set_data_dev(t83, /*value11*/ ctx[13]);
    			const numberspinner10_changes = {};

    			if (!updating_value_9 && dirty[0] & /*value11*/ 8192) {
    				updating_value_9 = true;
    				numberspinner10_changes.value = /*value11*/ ctx[13];
    				add_flush_callback(() => updating_value_9 = false);
    			}

    			numberspinner10.$set(numberspinner10_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(numberspinner0.$$.fragment, local);
    			transition_in(numberspinner1.$$.fragment, local);
    			transition_in(numberspinner2.$$.fragment, local);
    			transition_in(numberspinner3.$$.fragment, local);
    			transition_in(numberspinner4.$$.fragment, local);
    			transition_in(numberspinner5.$$.fragment, local);
    			transition_in(numberspinner6.$$.fragment, local);
    			transition_in(numberspinner7.$$.fragment, local);
    			transition_in(numberspinner8.$$.fragment, local);
    			transition_in(numberspinner9.$$.fragment, local);
    			transition_in(numberspinner10.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(numberspinner0.$$.fragment, local);
    			transition_out(numberspinner1.$$.fragment, local);
    			transition_out(numberspinner2.$$.fragment, local);
    			transition_out(numberspinner3.$$.fragment, local);
    			transition_out(numberspinner4.$$.fragment, local);
    			transition_out(numberspinner5.$$.fragment, local);
    			transition_out(numberspinner6.$$.fragment, local);
    			transition_out(numberspinner7.$$.fragment, local);
    			transition_out(numberspinner8.$$.fragment, local);
    			transition_out(numberspinner9.$$.fragment, local);
    			transition_out(numberspinner10.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(numberspinner0);
    			destroy_component(numberspinner1);
    			destroy_component(numberspinner2);
    			destroy_component(numberspinner3);
    			destroy_component(numberspinner4);
    			destroy_component(numberspinner5);
    			destroy_component(numberspinner6);
    			destroy_component(numberspinner7);
    			destroy_component(numberspinner8);
    			destroy_component(numberspinner9);
    			destroy_component(numberspinner10);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function addDollar(val) {
    	return "$ " + val;
    }

    function removeDollar(str) {
    	return str.replace("$", "").trim();
    }

    // Callback functions for example 10 ---------------------
    // Takes the actual value and returns a formatted time string
    function formatMinutesToTime(minutes) {
    	let hours = Math.floor(minutes / 60);
    	minutes = minutes % 60;
    	return hours.toString().padStart(2, "0") + ":" + minutes.toString().padStart(2, "0");
    }

    // Parses a time string like "16:45" to a number in minutes (result will be 16*60 + 45 = 1005)
    function parseTimeToMinutes(timeString) {
    	let res = timeString.split(":");
    	let hours = parseInt(res[0]);
    	hours = Math.min(Math.max(hours, 0), 23);
    	let minutes = res[1] ? parseInt(res[1]) : 0;
    	minutes = Math.min(Math.max(minutes, 0), 59);
    	return hours * 60 + minutes;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let value1 = 100;
    	let value2 = 500;
    	let value3 = 3.28;
    	let value4 = 0.5;
    	let value5 = 0.5;
    	let value6 = 50;
    	let value6input = value6;
    	let value6change = value6;
    	let value6editmode = false;
    	let value6lastkey = "";
    	let value7 = 0;
    	let value8 = -2.5;

    	let options = {
    		min: -5.5,
    		max: 5.5,
    		step: 1,
    		keyStep: 1,
    		keyStepFast: 2,
    		decimals: 1,
    		speed: 0.04
    	};

    	let value9 = 100;
    	let value10 = 12 * 60;
    	let value11 = 1;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function numberspinner0_value_binding(value) {
    		value1 = value;
    		$$invalidate(0, value1);
    	}

    	function numberspinner1_value_binding(value) {
    		value2 = value;
    		$$invalidate(1, value2);
    	}

    	function numberspinner2_value_binding(value) {
    		value3 = value;
    		$$invalidate(2, value3);
    	}

    	function numberspinner3_value_binding(value) {
    		value4 = value;
    		$$invalidate(3, value4);
    	}

    	function numberspinner4_value_binding(value) {
    		value5 = value;
    		$$invalidate(4, value5);
    	}

    	const change_handler = ev => {
    		$$invalidate(6, value6change = ev.detail);
    	};

    	const input_handler = ev => {
    		$$invalidate(5, value6input = ev.detail);
    	};

    	const keyup_handler = ev => {
    		$$invalidate(8, value6lastkey = ev.key);
    		console.log(ev);
    	};

    	const editstart_handler = ev => {
    		$$invalidate(7, value6editmode = true);
    	};

    	const editend_handler = ev => {
    		$$invalidate(7, value6editmode = false);
    	};

    	const click_handler = () => {
    		$$invalidate(9, value7--, value7);
    	};

    	function numberspinner6_value_binding(value) {
    		value7 = value;
    		$$invalidate(9, value7);
    	}

    	const click_handler_1 = () => {
    		$$invalidate(9, value7++, value7);
    	};

    	function numberspinner7_value_binding(value) {
    		value8 = value;
    		$$invalidate(10, value8);
    	}

    	function numberspinner8_value_binding(value) {
    		value9 = value;
    		$$invalidate(11, value9);
    	}

    	function numberspinner9_value_binding(value) {
    		value10 = value;
    		$$invalidate(12, value10);
    	}

    	const func = val => Math.pow(10, val).toFixed(1);
    	const func_1 = val => Math.log10(val);

    	function numberspinner10_value_binding(value) {
    		value11 = value;
    		$$invalidate(13, value11);
    	}

    	$$self.$capture_state = () => ({
    		NumberSpinner: dist,
    		value1,
    		value2,
    		value3,
    		value4,
    		value5,
    		value6,
    		value6input,
    		value6change,
    		value6editmode,
    		value6lastkey,
    		value7,
    		value8,
    		options,
    		value9,
    		value10,
    		value11,
    		addDollar,
    		removeDollar,
    		formatMinutesToTime,
    		parseTimeToMinutes
    	});

    	$$self.$inject_state = $$props => {
    		if ("value1" in $$props) $$invalidate(0, value1 = $$props.value1);
    		if ("value2" in $$props) $$invalidate(1, value2 = $$props.value2);
    		if ("value3" in $$props) $$invalidate(2, value3 = $$props.value3);
    		if ("value4" in $$props) $$invalidate(3, value4 = $$props.value4);
    		if ("value5" in $$props) $$invalidate(4, value5 = $$props.value5);
    		if ("value6" in $$props) $$invalidate(14, value6 = $$props.value6);
    		if ("value6input" in $$props) $$invalidate(5, value6input = $$props.value6input);
    		if ("value6change" in $$props) $$invalidate(6, value6change = $$props.value6change);
    		if ("value6editmode" in $$props) $$invalidate(7, value6editmode = $$props.value6editmode);
    		if ("value6lastkey" in $$props) $$invalidate(8, value6lastkey = $$props.value6lastkey);
    		if ("value7" in $$props) $$invalidate(9, value7 = $$props.value7);
    		if ("value8" in $$props) $$invalidate(10, value8 = $$props.value8);
    		if ("options" in $$props) $$invalidate(15, options = $$props.options);
    		if ("value9" in $$props) $$invalidate(11, value9 = $$props.value9);
    		if ("value10" in $$props) $$invalidate(12, value10 = $$props.value10);
    		if ("value11" in $$props) $$invalidate(13, value11 = $$props.value11);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		value1,
    		value2,
    		value3,
    		value4,
    		value5,
    		value6input,
    		value6change,
    		value6editmode,
    		value6lastkey,
    		value7,
    		value8,
    		value9,
    		value10,
    		value11,
    		value6,
    		options,
    		numberspinner0_value_binding,
    		numberspinner1_value_binding,
    		numberspinner2_value_binding,
    		numberspinner3_value_binding,
    		numberspinner4_value_binding,
    		change_handler,
    		input_handler,
    		keyup_handler,
    		editstart_handler,
    		editend_handler,
    		click_handler,
    		numberspinner6_value_binding,
    		click_handler_1,
    		numberspinner7_value_binding,
    		numberspinner8_value_binding,
    		numberspinner9_value_binding,
    		func,
    		func_1,
    		numberspinner10_value_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
