
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
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function empty() {
        return text('');
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
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
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
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
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

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    	  path: basedir,
    	  exports: {},
    	  require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
        }
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
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
        	style.id = "svelte-1dc5u64-style";
        	style.textContent = ".default.svelte-1dc5u64{display:inline-block;box-sizing:border-box;font-variant-numeric:tabular-nums;background-color:white;color:black;width:4em;height:1.6em;margin:0px;padding:0.25em;border:0.075em solid #0004;border-radius:0.15em;text-align:right;vertical-align:baseline;cursor:initial}.default.svelte-1dc5u64:focus{border:0.075em solid #06f;outline:none}.default.fast.svelte-1dc5u64{border-top-width:0.15em;padding-top:0.175em}.default.slow.svelte-1dc5u64{border-bottom-width:0.15em;padding-bottom:0.175em}.default.dragging.svelte-1dc5u64{border-color:#06f}.default.editing.svelte-1dc5u64{border:0.15em solid #06f;padding:0.175em;cursor:default}input.svelte-1dc5u64{user-select:none}input.svelte-1dc5u64:not(.editing)::selection{background:#0000}input.editing.svelte-1dc5u64{user-select:text}";
        	append(document_1.head, style);
        }

        function create_fragment(ctx) {
        	let input;
        	let input_class_value;
        	let input_contenteditable_value;
        	let mounted;
        	let dispose;

        	return {
        		c() {
        			input = element("input");
        			attr(input, "type", "text");
        			attr(input, "style", /*style*/ ctx[5]);
        			attr(input, "class", input_class_value = "" + (null_to_empty(/*$$props*/ ctx[17].class) + " svelte-1dc5u64"));
        			attr(input, "contenteditable", input_contenteditable_value = /*editing*/ ctx[3] ? "true" : "false");
        			attr(input, "tabindex", "0");
        			toggle_class(input, "default", !/*$$props*/ ctx[17].class ? true : false);
        			toggle_class(input, "fast", /*stepFactor*/ ctx[1] > 1 ? "fast" : "");
        			toggle_class(input, "slow", /*stepFactor*/ ctx[1] < 1 ? "slow" : "");
        			toggle_class(input, "dragging", /*dragging*/ ctx[2]);
        			toggle_class(input, "editing", /*editing*/ ctx[3]);
        		},
        		m(target, anchor) {
        			insert(target, input, anchor);
        			/*input_binding*/ ctx[41](input);
        			set_input_value(input, /*visibleValue*/ ctx[4]);

        			if (!mounted) {
        				dispose = [
        					listen(window, "mousemove", function () {
        						if (is_function(/*dragging*/ ctx[2] ? /*mousemoveHandler*/ ctx[8] : "")) (/*dragging*/ ctx[2] ? /*mousemoveHandler*/ ctx[8] : "").apply(this, arguments);
        					}),
        					listen(window, "mouseup", function () {
        						if (is_function(/*dragging*/ ctx[2] ? /*mouseupHandler*/ ctx[9] : "")) (/*dragging*/ ctx[2] ? /*mouseupHandler*/ ctx[9] : "").apply(this, arguments);
        					}),
        					listen(window, "touchmove", function () {
        						if (is_function(/*dragging*/ ctx[2] ? /*mousemoveHandler*/ ctx[8] : "")) (/*dragging*/ ctx[2] ? /*mousemoveHandler*/ ctx[8] : "").apply(this, arguments);
        					}),
        					listen(window, "touchend", function () {
        						if (is_function(/*dragging*/ ctx[2] ? /*mouseupHandler*/ ctx[9] : "")) (/*dragging*/ ctx[2] ? /*mouseupHandler*/ ctx[9] : "").apply(this, arguments);
        					}),
        					listen(window, "mousedown", function () {
        						if (is_function(/*editing*/ ctx[3] ? /*windowdownHandler*/ ctx[11] : "")) (/*editing*/ ctx[3] ? /*windowdownHandler*/ ctx[11] : "").apply(this, arguments);
        					}),
        					listen(window, "touchstart", function () {
        						if (is_function(/*editing*/ ctx[3] ? /*windowdownHandler*/ ctx[11] : "")) (/*editing*/ ctx[3] ? /*windowdownHandler*/ ctx[11] : "").apply(this, arguments);
        					}),
        					listen(window, "keydown", /*keydownHandler*/ ctx[15]),
        					listen(window, "keyup", /*keyupHandler*/ ctx[16]),
        					listen(input, "mouseenter", mouseenterHandler),
        					listen(input, "mouseleave", mouseleaveHandler),
        					listen(input, "mousedown", stop_propagation(/*mousedownHandler*/ ctx[7])),
        					listen(input, "touchstart", stop_propagation(prevent_default(/*touchstartHandler*/ ctx[6]))),
        					listen(input, "dblclick", stop_propagation(/*dblclickHandler*/ ctx[10])),
        					listen(input, "focus", /*focusHandler*/ ctx[12]),
        					listen(input, "blur", /*blurHandler*/ ctx[13]),
        					listen(input, "input", /*inputHandler*/ ctx[14]),
        					listen(input, "input", /*input_input_handler*/ ctx[42])
        				];

        				mounted = true;
        			}
        		},
        		p(new_ctx, dirty) {
        			ctx = new_ctx;

        			if (dirty[0] & /*style*/ 32) {
        				attr(input, "style", /*style*/ ctx[5]);
        			}

        			if (dirty[0] & /*$$props*/ 131072 && input_class_value !== (input_class_value = "" + (null_to_empty(/*$$props*/ ctx[17].class) + " svelte-1dc5u64"))) {
        				attr(input, "class", input_class_value);
        			}

        			if (dirty[0] & /*editing*/ 8 && input_contenteditable_value !== (input_contenteditable_value = /*editing*/ ctx[3] ? "true" : "false")) {
        				attr(input, "contenteditable", input_contenteditable_value);
        			}

        			if (dirty[0] & /*visibleValue*/ 16 && input.value !== /*visibleValue*/ ctx[4]) {
        				set_input_value(input, /*visibleValue*/ ctx[4]);
        			}

        			if (dirty[0] & /*$$props, $$props*/ 131072) {
        				toggle_class(input, "default", !/*$$props*/ ctx[17].class ? true : false);
        			}

        			if (dirty[0] & /*$$props, stepFactor*/ 131074) {
        				toggle_class(input, "fast", /*stepFactor*/ ctx[1] > 1 ? "fast" : "");
        			}

        			if (dirty[0] & /*$$props, stepFactor*/ 131074) {
        				toggle_class(input, "slow", /*stepFactor*/ ctx[1] < 1 ? "slow" : "");
        			}

        			if (dirty[0] & /*$$props, dragging*/ 131076) {
        				toggle_class(input, "dragging", /*dragging*/ ctx[2]);
        			}

        			if (dirty[0] & /*$$props, editing*/ 131080) {
        				toggle_class(input, "editing", /*editing*/ ctx[3]);
        			}
        		},
        		i: noop,
        		o: noop,
        		d(detaching) {
        			if (detaching) detach(input);
        			/*input_binding*/ ctx[41](null);
        			mounted = false;
        			run_all(dispose);
        		}
        	};
        }

        function mouseenterHandler(e) {
        	
        } // seems not to be very practical to have focus on rollover:
        // inputElement?.focus();

        function mouseleaveHandler(e) {
        	
        }

        function instance($$self, $$props, $$invalidate) {
        	const dispatch = createEventDispatcher();
        	let { options = {} } = $$props;
        	let { value = options.value ?? 0 } = $$props;
        	let { min = options.min ?? -Number.MAX_VALUE } = $$props;
        	let { max = options.max ?? Number.MAX_VALUE } = $$props;
        	let { step = options.step ?? 1 } = $$props;
        	let { precision = options.precision ?? undefined } = $$props;
        	precision = precision ?? step;
        	let { decimals = options.decimals ?? 0 } = $$props;
        	let { speed = options.speed ?? 1 } = $$props;
        	let { horizontal = options.horizontal ?? true } = $$props;
        	let { vertical = options.vertical ?? false } = $$props;
        	let { circular = options.circular ?? false } = $$props;
        	let { editOnClick = options.editOnClick ?? false } = $$props;
        	let { mainStyle = options.mainStyle ?? undefined } = $$props;
        	let { fastStyle = options.fastStyle ?? undefined } = $$props;
        	let { slowStyle = options.slowStyle ?? undefined } = $$props;
        	let { focusStyle = options.focusStyle ?? undefined } = $$props;
        	let { draggingStyle = options.draggingStyle ?? undefined } = $$props;
        	let { editingStyle = options.editingStyle ?? undefined } = $$props;
        	let { cursor = options.cursor ?? undefined } = $$props;
        	let inputElement;
        	let focussed = false;
        	let stepFactor = 1;
        	let dragging = false;
        	let clickX, clickY;
        	let hasMoved = 0;
        	let visibleValue;
        	let preciseValue;
        	let editing = false;
        	let altPressed = false;
        	let shiftPressed = false;
        	let style;
        	let isTouchDevice = false;
        	visibleValue = setValue(value);
        	preciseValue = setValue(value);
        	let htmlNode = document.querySelector("html");
        	let htmlNodeOriginalCursor = htmlNode.style.cursor;
        	let defaultCursor;

        	function touchstartHandler(e) {
        		dispatch("consoleLog", "touchstart");
        		isTouchDevice = true;
        		mousedownHandler(e);
        	}

        	function mousedownHandler(e) {
        		dispatch("consoleLog", "mousedown");

        		// console.log('down');
        		if (editing) {
        			e.stopPropagation();
        		} else {
        			hasMoved = 0;
        			clickX = isTouchDevice ? e.touches[0].clientX : e.clientX;
        			clickY = isTouchDevice ? e.touches[0].clientY : e.clientY;
        			$$invalidate(2, dragging = true);
        			preciseValue = setValue(value);
        		} //console.log(e.clientX, e.clientY);
        	}

        	function mousemoveHandler(e) {
        		// dispatch('consoleLog', 'mousemove');
        		let actX = isTouchDevice ? e.touches[0].clientX : e.clientX;

        		let actY = isTouchDevice ? e.touches[0].clientY : e.clientY;
        		let distX = horizontal ? actX - clickX : 0;
        		let distY = vertical ? -(actY - clickY) : 0;
        		let stepNum = Math.abs(distX) > Math.abs(distY) ? distX : distY;
        		stepValue(stepNum);
        		clickX = actX;
        		clickY = actY;
        		hasMoved++;
        	}

        	function mouseupHandler(e) {
        		dispatch("consoleLog", "mouseup");

        		// console.log('up');
        		$$invalidate(2, dragging = false);

        		if (editOnClick && hasMoved < 2) {
        			startEditing();
        		}
        	}

        	function dblclickHandler(e) {
        		dispatch("consoleLog", "dblclick");

        		if (!editOnClick) {
        			startEditing();
        		}
        	}

        	function windowdownHandler(e) {
        		dispatch("consoleLog", "window mousedown");

        		// console.log('window mousedown');
        		stopEditing();
        	}

        	function focusHandler(e) {
        		dispatch("consoleLog", "focus");

        		// console.log(inputElement);
        		$$invalidate(37, focussed = true);

        		stopEditing();
        	}

        	function blurHandler(e) {
        		dispatch("consoleLog", "blur");

        		// console.log('blur');
        		$$invalidate(37, focussed = false);

        		stopEditing();
        	}

        	function inputHandler(e) {
        		// console.log(e);
        		let checkValue = parseFloat(inputElement.value);

        		if (!isNaN(checkValue)) {
        			preciseValue = checkValue;
        			preciseValue = keepInRange(preciseValue);
        			dispatch("input", parseFloat(roundToPrecision(preciseValue)));
        		}
        	}

        	function keydownHandler(e) {
        		// console.log(e);
        		if (e.key == "Shift") {
        			$$invalidate(39, shiftPressed = true);
        		}

        		if (e.key == "Alt") {
        			$$invalidate(38, altPressed = true);
        		}
        	}

        	function keyupHandler(e) {
        		// console.log(e)
        		if (e.key == "Shift") {
        			$$invalidate(39, shiftPressed = false);
        		}

        		if (e.key == "Alt") {
        			$$invalidate(38, altPressed = false);
        		}

        		if (focussed) {
        			if (!editing) {
        				// increment should at least be step
        				let increment = Math.max(step, step * Math.round(10 * speed));

        				if (e.key == "ArrowUp" || e.key == "ArrowRight") {
        					addToValue(increment);
        				}

        				if (e.key == "ArrowDown" || e.key == "ArrowLeft") {
        					addToValue(-increment);
        				}
        			}

        			if (e.key == "Enter") {
        				if (!editing) {
        					startEditing();
        				} else {
        					stopEditing();
        				}
        			}

        			if (e.key == "Escape") {
        				if (editing) {
        					stopEditing();
        				}
        			}
        		}
        	}

        	function stepValue(numSteps) {
        		preciseValue = preciseValue ?? parseFloat(visibleValue);
        		preciseValue += numSteps * step * stepFactor * speed;
        		setValue(preciseValue);
        	}

        	function addToValue(increment) {
        		preciseValue = preciseValue ?? parseFloat(visibleValue);
        		preciseValue += increment * stepFactor;
        		setValue(preciseValue);
        	}

        	function setValue(val) {
        		preciseValue = parseFloat(val);
        		preciseValue = keepInRange(preciseValue);
        		$$invalidate(4, visibleValue = Math.round(preciseValue / step) * step);
        		$$invalidate(4, visibleValue = visibleValue.toFixed(decimals));
        		$$invalidate(18, value = roundToPrecision(preciseValue));
        		dispatch("input", parseFloat(value));
        		dispatch("change", parseFloat(value));
        	}

        	function keepInRange(val) {
        		$$invalidate(19, min = parseFloat(min));
        		$$invalidate(20, max = parseFloat(max));

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
        		val = Math.round(parseFloat(val) / precision) * precision;
        		let dec = precision < 1 ? Math.ceil(-Math.log10(precision)) : 0;
        		return parseFloat(val.toFixed(dec));
        	}

        	function startEditing() {
        		if (isTouchDevice) return;
        		preciseValue = parseFloat(visibleValue);
        		$$invalidate(3, editing = true);
        		inputElement?.setSelectionRange(0, 30);
        	}

        	function stopEditing() {
        		if (isTouchDevice) return;
        		$$invalidate(3, editing = false);
        		inputElement?.setSelectionRange(0, 0);
        		preciseValue = parseFloat(visibleValue);
        		setValue(preciseValue);
        	}

        	function input_binding($$value) {
        		binding_callbacks[$$value ? "unshift" : "push"](() => {
        			inputElement = $$value;
        			($$invalidate(0, inputElement), $$invalidate(3, editing));
        		});
        	}

        	function input_input_handler() {
        		visibleValue = this.value;
        		$$invalidate(4, visibleValue);
        	}

        	$$self.$$set = $$new_props => {
        		$$invalidate(17, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
        		if ("options" in $$new_props) $$invalidate(22, options = $$new_props.options);
        		if ("value" in $$new_props) $$invalidate(18, value = $$new_props.value);
        		if ("min" in $$new_props) $$invalidate(19, min = $$new_props.min);
        		if ("max" in $$new_props) $$invalidate(20, max = $$new_props.max);
        		if ("step" in $$new_props) $$invalidate(23, step = $$new_props.step);
        		if ("precision" in $$new_props) $$invalidate(21, precision = $$new_props.precision);
        		if ("decimals" in $$new_props) $$invalidate(24, decimals = $$new_props.decimals);
        		if ("speed" in $$new_props) $$invalidate(25, speed = $$new_props.speed);
        		if ("horizontal" in $$new_props) $$invalidate(26, horizontal = $$new_props.horizontal);
        		if ("vertical" in $$new_props) $$invalidate(27, vertical = $$new_props.vertical);
        		if ("circular" in $$new_props) $$invalidate(28, circular = $$new_props.circular);
        		if ("editOnClick" in $$new_props) $$invalidate(29, editOnClick = $$new_props.editOnClick);
        		if ("mainStyle" in $$new_props) $$invalidate(30, mainStyle = $$new_props.mainStyle);
        		if ("fastStyle" in $$new_props) $$invalidate(31, fastStyle = $$new_props.fastStyle);
        		if ("slowStyle" in $$new_props) $$invalidate(32, slowStyle = $$new_props.slowStyle);
        		if ("focusStyle" in $$new_props) $$invalidate(33, focusStyle = $$new_props.focusStyle);
        		if ("draggingStyle" in $$new_props) $$invalidate(34, draggingStyle = $$new_props.draggingStyle);
        		if ("editingStyle" in $$new_props) $$invalidate(35, editingStyle = $$new_props.editingStyle);
        		if ("cursor" in $$new_props) $$invalidate(36, cursor = $$new_props.cursor);
        	};

        	$$self.$$.update = () => {
        		if ($$self.$$.dirty[0] & /*editing, dragging, value*/ 262156) {
        			// updaters --------------------------------
        			{
        				if (!editing && !dragging) {
        					setValue(value);
        				}
        			}
        		}

        		if ($$self.$$.dirty[0] & /*inputElement, editing*/ 9) {
        			if (inputElement) {
        				$$invalidate(0, inputElement.readOnly = !editing, inputElement);
        			}
        		}

        		if ($$self.$$.dirty[0] & /*editing*/ 8 | $$self.$$.dirty[1] & /*focussed, altPressed, shiftPressed*/ 448) {
        			{
        				$$invalidate(1, stepFactor = 1);

        				if (focussed && !editing) {
        					if (altPressed && shiftPressed) {
        						$$invalidate(1, stepFactor = 10);
        					} else if (altPressed) {
        						$$invalidate(1, stepFactor = 0.1);
        					}
        				}
        			}
        		}

        		if ($$self.$$.dirty[0] & /*horizontal, vertical, dragging*/ 201326596 | $$self.$$.dirty[1] & /*cursor, defaultCursor*/ 544) {
        			{
        				// let cursorClass = horizontal
        				//   ? vertical
        				//     ? 'move-cursor'
        				//     : 'horizontal-cursor'
        				//   : 'vertical-cursor';
        				$$invalidate(40, defaultCursor = horizontal
        				? vertical ? "move" : "ew-resize"
        				: "ns-resize");

        				if (dragging) {
        					htmlNode.style.cursor = cursor ?? defaultCursor;
        				} else {
        					htmlNode.style.cursor = htmlNodeOriginalCursor; // addClass(htmlNode, cursorClass);
        				} // removeClass(htmlNode, cursorClass);
        			}
        		}

        		if ($$self.$$.dirty[0] & /*mainStyle, style, editing, stepFactor, dragging*/ 1073741870 | $$self.$$.dirty[1] & /*focussed, focusStyle, fastStyle, slowStyle, draggingStyle, editingStyle, cursor, defaultCursor*/ 639) {
        			{
        				$$invalidate(5, style = mainStyle ?? "");
        				$$invalidate(5, style += focussed && focusStyle ? ";" + focusStyle : "");

        				$$invalidate(5, style += !editing && stepFactor > 1 && fastStyle
        				? ";" + fastStyle
        				: "");

        				$$invalidate(5, style += !editing && stepFactor < 1 && slowStyle
        				? ";" + slowStyle
        				: "");

        				$$invalidate(5, style += dragging && draggingStyle ? ";" + draggingStyle : "");
        				$$invalidate(5, style += editing && editingStyle ? ";" + editingStyle : "");
        				$$invalidate(5, style += !editing ? ";cursor:" + (cursor ?? defaultCursor) : "");
        			}
        		}
        	};

        	$$props = exclude_internal_props($$props);

        	return [
        		inputElement,
        		stepFactor,
        		dragging,
        		editing,
        		visibleValue,
        		style,
        		touchstartHandler,
        		mousedownHandler,
        		mousemoveHandler,
        		mouseupHandler,
        		dblclickHandler,
        		windowdownHandler,
        		focusHandler,
        		blurHandler,
        		inputHandler,
        		keydownHandler,
        		keyupHandler,
        		$$props,
        		value,
        		min,
        		max,
        		precision,
        		options,
        		step,
        		decimals,
        		speed,
        		horizontal,
        		vertical,
        		circular,
        		editOnClick,
        		mainStyle,
        		fastStyle,
        		slowStyle,
        		focusStyle,
        		draggingStyle,
        		editingStyle,
        		cursor,
        		focussed,
        		altPressed,
        		shiftPressed,
        		defaultCursor,
        		input_binding,
        		input_input_handler
        	];
        }

        class NumberSpinner extends SvelteComponent {
        	constructor(options) {
        		super();
        		if (!document_1.getElementById("svelte-1dc5u64-style")) add_css();

        		init(
        			this,
        			options,
        			instance,
        			create_fragment,
        			safe_not_equal,
        			{
        				options: 22,
        				value: 18,
        				min: 19,
        				max: 20,
        				step: 23,
        				precision: 21,
        				decimals: 24,
        				speed: 25,
        				horizontal: 26,
        				vertical: 27,
        				circular: 28,
        				editOnClick: 29,
        				mainStyle: 30,
        				fastStyle: 31,
        				slowStyle: 32,
        				focusStyle: 33,
        				draggingStyle: 34,
        				editingStyle: 35,
        				cursor: 36
        			},
        			[-1, -1]
        		);
        	}
        }

        return NumberSpinner;

    })));
    });

    /* example/src/App2.svelte generated by Svelte v3.38.2 */
    const file = "example/src/App2.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	child_ctx[8] = i;
    	return child_ctx;
    }

    // (29:4) {#if logs[i+1]?.timestamp < log.timestamp - 200}
    function create_if_block(ctx) {
    	let br;

    	const block = {
    		c: function create() {
    			br = element("br");
    			add_location(br, file, 28, 52, 665);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, br, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(29:4) {#if logs[i+1]?.timestamp < log.timestamp - 200}",
    		ctx
    	});

    	return block;
    }

    // (25:2) {#each logs as log, i}
    function create_each_block(ctx) {
    	let t0_value = new Date(/*log*/ ctx[6].timestamp).toLocaleTimeString("de-DE") + "";
    	let t0;
    	let t1;
    	let t2_value = (/*log*/ ctx[6].timestamp % 1000).toString().padStart(3, "0") + "";
    	let t2;
    	let t3;
    	let t4_value = /*log*/ ctx[6].msg + "";
    	let t4;
    	let br;
    	let t5;
    	let if_block_anchor;
    	let if_block = /*logs*/ ctx[2][/*i*/ ctx[8] + 1]?.timestamp < /*log*/ ctx[6].timestamp - 200 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = text(".");
    			t2 = text(t2_value);
    			t3 = text(" – ");
    			t4 = text(t4_value);
    			br = element("br");
    			t5 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			add_location(br, file, 26, 124, 607);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t5, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*logs*/ 4 && t0_value !== (t0_value = new Date(/*log*/ ctx[6].timestamp).toLocaleTimeString("de-DE") + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*logs*/ 4 && t2_value !== (t2_value = (/*log*/ ctx[6].timestamp % 1000).toString().padStart(3, "0") + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*logs*/ 4 && t4_value !== (t4_value = /*log*/ ctx[6].msg + "")) set_data_dev(t4, t4_value);

    			if (/*logs*/ ctx[2][/*i*/ ctx[8] + 1]?.timestamp < /*log*/ ctx[6].timestamp - 200) {
    				if (if_block) ; else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t5);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(25:2) {#each logs as log, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div0;
    	let numberspinner0;
    	let updating_value;
    	let t0;
    	let hr0;
    	let t1;
    	let div1;
    	let numberspinner1;
    	let updating_value_1;
    	let t2;
    	let hr1;
    	let t3;
    	let div2;
    	let current;

    	function numberspinner0_value_binding(value) {
    		/*numberspinner0_value_binding*/ ctx[3](value);
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
    	numberspinner0.$on("consoleLog", /*consoleLog_handler*/ ctx[4]);

    	function numberspinner1_value_binding(value) {
    		/*numberspinner1_value_binding*/ ctx[5](value);
    	}

    	let numberspinner1_props = { vertical: true, horizontal: false };

    	if (/*value2*/ ctx[1] !== void 0) {
    		numberspinner1_props.value = /*value2*/ ctx[1];
    	}

    	numberspinner1 = new dist({
    			props: numberspinner1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner1, "value", numberspinner1_value_binding));
    	let each_value = /*logs*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(numberspinner0.$$.fragment);
    			t0 = space();
    			hr0 = element("hr");
    			t1 = space();
    			div1 = element("div");
    			create_component(numberspinner1.$$.fragment);
    			t2 = space();
    			hr1 = element("hr");
    			t3 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "row svelte-bq8nj9");
    			add_location(div0, file, 10, 0, 178);
    			attr_dev(hr0, "class", "svelte-bq8nj9");
    			add_location(hr0, file, 14, 0, 322);
    			attr_dev(div1, "class", "row svelte-bq8nj9");
    			add_location(div1, file, 16, 0, 328);
    			attr_dev(hr1, "class", "svelte-bq8nj9");
    			add_location(hr1, file, 20, 0, 428);
    			attr_dev(div2, "class", "console svelte-bq8nj9");
    			add_location(div2, file, 23, 0, 435);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(numberspinner0, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, hr0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(numberspinner1, div1, null);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, hr1, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div2, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const numberspinner0_changes = {};

    			if (!updating_value && dirty & /*value1*/ 1) {
    				updating_value = true;
    				numberspinner0_changes.value = /*value1*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			numberspinner0.$set(numberspinner0_changes);
    			const numberspinner1_changes = {};

    			if (!updating_value_1 && dirty & /*value2*/ 2) {
    				updating_value_1 = true;
    				numberspinner1_changes.value = /*value2*/ ctx[1];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			numberspinner1.$set(numberspinner1_changes);

    			if (dirty & /*logs, Date*/ 4) {
    				each_value = /*logs*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(numberspinner0.$$.fragment, local);
    			transition_in(numberspinner1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(numberspinner0.$$.fragment, local);
    			transition_out(numberspinner1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(numberspinner0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(hr0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			destroy_component(numberspinner1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(hr1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
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

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App2", slots, []);
    	let value1 = 100;
    	let value2 = 33;
    	let logs = [];
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App2> was created with unknown prop '${key}'`);
    	});

    	function numberspinner0_value_binding(value) {
    		value1 = value;
    		$$invalidate(0, value1);
    	}

    	const consoleLog_handler = e => $$invalidate(2, logs = [{ timestamp: Date.now(), msg: e.detail }, ...logs]);

    	function numberspinner1_value_binding(value) {
    		value2 = value;
    		$$invalidate(1, value2);
    	}

    	$$self.$capture_state = () => ({ NumberSpinner: dist, value1, value2, logs });

    	$$self.$inject_state = $$props => {
    		if ("value1" in $$props) $$invalidate(0, value1 = $$props.value1);
    		if ("value2" in $$props) $$invalidate(1, value2 = $$props.value2);
    		if ("logs" in $$props) $$invalidate(2, logs = $$props.logs);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		value1,
    		value2,
    		logs,
    		numberspinner0_value_binding,
    		consoleLog_handler,
    		numberspinner1_value_binding
    	];
    }

    class App2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App2",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App2({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
