
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
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
        const prop_values = options.props || {};
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
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor);
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.2' }, detail)));
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
        function set_style(node, key, value, important) {
            node.style.setProperty(key, value, important ? 'important' : '');
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
        function mount_component(component, target, anchor) {
            const { fragment, on_mount, on_destroy, after_update } = component.$$;
            fragment && fragment.m(target, anchor);
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
            const prop_values = options.props || {};
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
                before_update: [],
                after_update: [],
                context: new Map(parent_component ? parent_component.$$.context : []),
                // everything else
                callbacks: blank_object(),
                dirty,
                skip_bound: false
            };
            let ready = false;
            $$.ctx = instance
                ? instance(component, prop_values, (i, ret, ...rest) => {
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
                mount_component(component, options.target, options.anchor);
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

        /* src/NumberSpinner.svelte generated by Svelte v3.31.2 */

        function add_css() {
        	var style = element("style");
        	style.id = "svelte-1n0knvs-style";
        	style.textContent = ".default.svelte-1n0knvs{display:inline-block;box-sizing:border-box;font-variant-numeric:tabular-nums;background-color:white;color:black;margin:0px;padding:5px;border:1px solid #0004;border-radius:5px;text-align:right;cursor:initial}.default.svelte-1n0knvs:focus{border:1px solid #06f;outline-width:0;outline:none}.default.editing.svelte-1n0knvs{border:2px solid #06f;padding:4px;cursor:default}.default.svelte-1n0knvs::selection{background:#06f3}.default.fast.svelte-1n0knvs{color:tomato}.default.slow.svelte-1n0knvs{color:green}input.svelte-1n0knvs{user-select:none}input.hide-selection.svelte-1n0knvs::selection{background:#0000}input.editing.svelte-1n0knvs{user-select:text}";
        	append(document.head, style);
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
        			set_style(input, "width", /*width*/ ctx[0] + "px");
        			set_style(input, "height", /*height*/ ctx[1] + "px");
        			attr(input, "class", input_class_value = "" + (null_to_empty(/*$$props*/ ctx[18].class) + " svelte-1n0knvs"));
        			attr(input, "contenteditable", input_contenteditable_value = /*editing*/ ctx[3] ? "true" : "false");
        			attr(input, "tabindex", "0");
        			toggle_class(input, "default", !/*$$props*/ ctx[18].class ? true : false);
        			toggle_class(input, "fast", /*stepFactor*/ ctx[4] > 1 ? "fast" : "");
        			toggle_class(input, "slow", /*stepFactor*/ ctx[4] < 1 ? "slow" : "");
        			toggle_class(input, "editing", /*editing*/ ctx[3]);
        			toggle_class(input, "hide-selection", /*editing*/ ctx[3] ? "" : "hide-selection  ");
        		},
        		m(target, anchor) {
        			insert(target, input, anchor);
        			set_input_value(input, /*visibleValue*/ ctx[6]);
        			/*input_binding*/ ctx[30](input);

        			if (!mounted) {
        				dispose = [
        					listen(window, "mousemove", function () {
        						if (is_function(/*dragging*/ ctx[5] ? /*mousemoveHandler*/ ctx[9] : "")) (/*dragging*/ ctx[5] ? /*mousemoveHandler*/ ctx[9] : "").apply(this, arguments);
        					}),
        					listen(window, "mouseup", function () {
        						if (is_function(/*dragging*/ ctx[5] ? /*mouseupHandler*/ ctx[10] : "")) (/*dragging*/ ctx[5] ? /*mouseupHandler*/ ctx[10] : "").apply(this, arguments);
        					}),
        					listen(window, "mousedown", function () {
        						if (is_function(/*editing*/ ctx[3] ? /*windowdownHandler*/ ctx[12] : "")) (/*editing*/ ctx[3] ? /*windowdownHandler*/ ctx[12] : "").apply(this, arguments);
        					}),
        					listen(window, "keydown", /*keydownHandler*/ ctx[16]),
        					listen(window, "keyup", /*keyupHandler*/ ctx[17]),
        					listen(input, "mouseenter", /*mouseenterHandler*/ ctx[7]),
        					listen(input, "mouseleave", mouseleaveHandler),
        					listen(input, "mousedown", /*mousedownHandler*/ ctx[8]),
        					listen(input, "dblclick", /*dblclickHandler*/ ctx[11]),
        					listen(input, "focus", /*focusHandler*/ ctx[13]),
        					listen(input, "blur", /*blurHandler*/ ctx[14]),
        					listen(input, "input", /*inputHandler*/ ctx[15]),
        					listen(input, "change", changeHandler),
        					listen(input, "input", /*input_input_handler*/ ctx[29])
        				];

        				mounted = true;
        			}
        		},
        		p(new_ctx, dirty) {
        			ctx = new_ctx;

        			if (dirty[0] & /*width*/ 1) {
        				set_style(input, "width", /*width*/ ctx[0] + "px");
        			}

        			if (dirty[0] & /*height*/ 2) {
        				set_style(input, "height", /*height*/ ctx[1] + "px");
        			}

        			if (dirty[0] & /*$$props*/ 262144 && input_class_value !== (input_class_value = "" + (null_to_empty(/*$$props*/ ctx[18].class) + " svelte-1n0knvs"))) {
        				attr(input, "class", input_class_value);
        			}

        			if (dirty[0] & /*editing*/ 8 && input_contenteditable_value !== (input_contenteditable_value = /*editing*/ ctx[3] ? "true" : "false")) {
        				attr(input, "contenteditable", input_contenteditable_value);
        			}

        			if (dirty[0] & /*visibleValue*/ 64 && input.value !== /*visibleValue*/ ctx[6]) {
        				set_input_value(input, /*visibleValue*/ ctx[6]);
        			}

        			if (dirty[0] & /*$$props, $$props*/ 262144) {
        				toggle_class(input, "default", !/*$$props*/ ctx[18].class ? true : false);
        			}

        			if (dirty[0] & /*$$props, stepFactor*/ 262160) {
        				toggle_class(input, "fast", /*stepFactor*/ ctx[4] > 1 ? "fast" : "");
        			}

        			if (dirty[0] & /*$$props, stepFactor*/ 262160) {
        				toggle_class(input, "slow", /*stepFactor*/ ctx[4] < 1 ? "slow" : "");
        			}

        			if (dirty[0] & /*$$props, editing*/ 262152) {
        				toggle_class(input, "editing", /*editing*/ ctx[3]);
        			}

        			if (dirty[0] & /*$$props, editing*/ 262152) {
        				toggle_class(input, "hide-selection", /*editing*/ ctx[3] ? "" : "hide-selection  ");
        			}
        		},
        		i: noop,
        		o: noop,
        		d(detaching) {
        			if (detaching) detach(input);
        			/*input_binding*/ ctx[30](null);
        			mounted = false;
        			run_all(dispose);
        		}
        	};
        }

        function mouseleaveHandler(e) {
        	
        }

        function changeHandler(e) {
        	
        } // console.log(e);
        // dispatch('input', value);

        function instance($$self, $$props, $$invalidate) {
        	let { value = 0 } = $$props;
        	let { min = -Number.MAX_VALUE } = $$props;
        	let { max = Number.MAX_VALUE } = $$props;
        	let { step = 1 } = $$props;
        	let { decimals = 0 } = $$props;
        	let { width = 60 } = $$props;
        	let { height = 25 } = $$props;
        	let { horizontal = true } = $$props;
        	let { vertical = true } = $$props;
        	const dispatch = createEventDispatcher();
        	let inputElement;
        	let focussed = false;
        	let stepFactor = 1;
        	let dragging = false;
        	let clickX, clickY;
        	let visibleValue;
        	let preciseValue;
        	let editing = false;
        	let altPressed = false;
        	let shiftPressed = false;
        	visibleValue = setValue(value);
        	preciseValue = setValue(value);

        	// handlers --------------------------------
        	function mouseenterHandler(e) {
        		inputElement?.focus();
        	}

        	function mousedownHandler(e) {
        		// console.log('down');
        		if (editing) {
        			e.stopPropagation();
        		} else {
        			clickX = e.clientX;
        			clickY = e.clientY;
        			$$invalidate(5, dragging = true);
        			preciseValue = setValue(value);
        		} //console.log(e.clientX, e.clientY);
        	}

        	function mousemoveHandler(e) {
        		let actX = e.clientX;
        		let actY = e.clientY;
        		let distX = horizontal ? actX - clickX : 0;
        		let distY = vertical ? -(actY - clickY) : 0;
        		let stepNum = Math.abs(distX) > Math.abs(distY) ? distX : distY;
        		stepValue(stepNum);
        		clickX = actX;
        		clickY = actY;
        	}

        	function mouseupHandler(e) {
        		// console.log('up');
        		$$invalidate(5, dragging = false);

        		$$invalidate(4, stepFactor = 1);
        	}

        	async function dblclickHandler(e) {
        		startEditing();
        	}

        	function windowdownHandler(e) {
        		// console.log('window mousedown');
        		stopEditing();
        	}

        	function focusHandler(e) {
        		// console.log(inputElement);
        		$$invalidate(26, focussed = true);

        		stopEditing();
        	}

        	function blurHandler(e) {
        		// console.log('blur');
        		$$invalidate(26, focussed = false);

        		stopEditing();
        	}

        	function inputHandler(e) {
        		// console.log(e);
        		let checkValue = parseFloat(inputElement.value);

        		if (!isNaN(checkValue)) {
        			preciseValue = checkValue;
        			preciseValue = Math.min(preciseValue, max);
        			preciseValue = Math.max(preciseValue, min);
        			$$invalidate(6, visibleValue = preciseValue.toFixed(decimals));
        			dispatch("input", visibleValue);
        		}
        	}

        	function keydownHandler(e) {
        		// console.log(e);
        		if (e.key == "Shift") {
        			$$invalidate(28, shiftPressed = true);
        		}

        		if (e.key == "Alt") {
        			$$invalidate(27, altPressed = true);
        		}
        	}

        	function keyupHandler(e) {
        		// console.log(e)
        		if (e.key == "Shift") {
        			$$invalidate(28, shiftPressed = false);
        		}

        		if (e.key == "Alt") {
        			$$invalidate(27, altPressed = false);
        		}

        		if (focussed) {
        			if (!editing) {
        				if (vertical && e.key == "ArrowUp" || horizontal && e.key == "ArrowRight") {
        					stepValue(10);
        				}

        				if (vertical && e.key == "ArrowDown" || horizontal && e.key == "ArrowLeft") {
        					stepValue(-10);
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

        	function setValue(val) {
        		preciseValue = parseFloat(val);
        		preciseValue = Math.min(preciseValue, max);
        		preciseValue = Math.max(preciseValue, min);
        		$$invalidate(6, visibleValue = preciseValue.toFixed(decimals));
        		$$invalidate(19, value = preciseValue.toFixed(decimals));
        		dispatch("input", value);
        		dispatch("change", value);
        	}

        	function stepValue(numSteps) {
        		preciseValue = preciseValue ?? parseFloat(visibleValue);
        		preciseValue += numSteps * step * stepFactor;
        		preciseValue = Math.min(preciseValue, max);
        		preciseValue = Math.max(preciseValue, min);
        		$$invalidate(6, visibleValue = preciseValue.toFixed(decimals));
        		$$invalidate(19, value = preciseValue.toFixed(decimals));
        		dispatch("input", value);
        		dispatch("change", value);
        	}

        	function startEditing() {
        		preciseValue = parseFloat(visibleValue);
        		$$invalidate(3, editing = true);
        		inputElement?.setSelectionRange(0, 30);
        	}

        	function stopEditing() {
        		$$invalidate(3, editing = false);
        		inputElement?.setSelectionRange(0, 0);
        		preciseValue = parseFloat(visibleValue);
        		setValue(preciseValue);
        	}

        	function input_input_handler() {
        		visibleValue = this.value;
        		$$invalidate(6, visibleValue);
        	}

        	function input_binding($$value) {
        		binding_callbacks[$$value ? "unshift" : "push"](() => {
        			inputElement = $$value;
        			($$invalidate(2, inputElement), $$invalidate(3, editing));
        		});
        	}

        	$$self.$$set = $$new_props => {
        		$$invalidate(18, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
        		if ("value" in $$new_props) $$invalidate(19, value = $$new_props.value);
        		if ("min" in $$new_props) $$invalidate(20, min = $$new_props.min);
        		if ("max" in $$new_props) $$invalidate(21, max = $$new_props.max);
        		if ("step" in $$new_props) $$invalidate(22, step = $$new_props.step);
        		if ("decimals" in $$new_props) $$invalidate(23, decimals = $$new_props.decimals);
        		if ("width" in $$new_props) $$invalidate(0, width = $$new_props.width);
        		if ("height" in $$new_props) $$invalidate(1, height = $$new_props.height);
        		if ("horizontal" in $$new_props) $$invalidate(24, horizontal = $$new_props.horizontal);
        		if ("vertical" in $$new_props) $$invalidate(25, vertical = $$new_props.vertical);
        	};

        	$$self.$$.update = () => {
        		if ($$self.$$.dirty[0] & /*inputElement, editing*/ 12) {
        			// updaters --------------------------------
        			 if (inputElement) {
        				$$invalidate(2, inputElement.readOnly = !editing, inputElement);
        			}
        		}

        		if ($$self.$$.dirty[0] & /*focussed, shiftPressed, altPressed*/ 469762048) {
        			 {
        				$$invalidate(4, stepFactor = 1);

        				if (focussed) {
        					if (shiftPressed) {
        						$$invalidate(4, stepFactor = 10);
        					} else if (altPressed) {
        						$$invalidate(4, stepFactor = 0.1);
        					}
        				}
        			}
        		}
        	};

        	$$props = exclude_internal_props($$props);

        	return [
        		width,
        		height,
        		inputElement,
        		editing,
        		stepFactor,
        		dragging,
        		visibleValue,
        		mouseenterHandler,
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
        		step,
        		decimals,
        		horizontal,
        		vertical,
        		focussed,
        		altPressed,
        		shiftPressed,
        		input_input_handler,
        		input_binding
        	];
        }

        class NumberSpinner extends SvelteComponent {
        	constructor(options) {
        		super();
        		if (!document.getElementById("svelte-1n0knvs-style")) add_css();

        		init(
        			this,
        			options,
        			instance,
        			create_fragment,
        			safe_not_equal,
        			{
        				value: 19,
        				min: 20,
        				max: 21,
        				step: 22,
        				decimals: 23,
        				width: 0,
        				height: 1,
        				horizontal: 24,
        				vertical: 25
        			},
        			[-1, -1]
        		);
        	}
        }

        return NumberSpinner;

    })));
    });

    /* example/src/App.svelte generated by Svelte v3.31.2 */
    const file = "example/src/App.svelte";

    function create_fragment(ctx) {
    	let h2;
    	let t1;
    	let p;
    	let t2;
    	let br0;
    	let t3;
    	let t4;
    	let table;
    	let tr0;
    	let td0;
    	let t6;
    	let td1;
    	let numberspinner0;
    	let updating_value;
    	let t7;
    	let td2;
    	let t8;
    	let t9;
    	let t10;
    	let tr1;
    	let td3;
    	let t12;
    	let td4;
    	let numberspinner1;
    	let updating_value_1;
    	let t13;
    	let td5;
    	let t14;
    	let t15;
    	let t16;
    	let tr2;
    	let td6;
    	let t18;
    	let td7;
    	let numberspinner2;
    	let updating_value_2;
    	let t19;
    	let td8;
    	let t20;
    	let t21;
    	let t22;
    	let tr3;
    	let td9;
    	let t24;
    	let td10;
    	let numberspinner3;
    	let updating_value_3;
    	let t25;
    	let td11;
    	let t26;
    	let t27;
    	let t28;
    	let tr4;
    	let td12;
    	let t30;
    	let td13;
    	let numberspinner4;
    	let t31;
    	let td14;
    	let t32;
    	let t33;
    	let br1;
    	let t34;
    	let t35;
    	let current;

    	function numberspinner0_value_binding(value) {
    		/*numberspinner0_value_binding*/ ctx[7].call(null, value);
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
    		/*numberspinner1_value_binding*/ ctx[8].call(null, value);
    	}

    	let numberspinner1_props = { min: "0", max: "1000", vertical: false };

    	if (/*value2*/ ctx[1] !== void 0) {
    		numberspinner1_props.value = /*value2*/ ctx[1];
    	}

    	numberspinner1 = new dist({
    			props: numberspinner1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner1, "value", numberspinner1_value_binding));

    	function numberspinner2_value_binding(value) {
    		/*numberspinner2_value_binding*/ ctx[9].call(null, value);
    	}

    	let numberspinner2_props = {
    		min: "-5",
    		max: "5",
    		step: "0.01",
    		decimals: "2"
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
    		/*numberspinner3_value_binding*/ ctx[10].call(null, value);
    	}

    	let numberspinner3_props = {
    		min: "0",
    		max: "1",
    		step: "0.001",
    		decimals: "3",
    		class: "number-spinner-custom"
    	};

    	if (/*value4*/ ctx[3] !== void 0) {
    		numberspinner3_props.value = /*value4*/ ctx[3];
    	}

    	numberspinner3 = new dist({
    			props: numberspinner3_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberspinner3, "value", numberspinner3_value_binding));

    	numberspinner4 = new dist({
    			props: {
    				value: /*value5*/ ctx[6],
    				min: "0",
    				max: "100"
    			},
    			$$inline: true
    		});

    	numberspinner4.$on("change", /*change_handler*/ ctx[11]);
    	numberspinner4.$on("input", /*input_handler*/ ctx[12]);

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Svelte Number Spinner Example";
    			t1 = space();
    			p = element("p");
    			t2 = text("Change the values of the number spinners through mousedrag and arrow keys.");
    			br0 = element("br");
    			t3 = text("\n  Press 'Alt' for smaller steps, 'Shift' for larger steps. Double click to edit.");
    			t4 = space();
    			table = element("table");
    			tr0 = element("tr");
    			td0 = element("td");
    			td0.textContent = "Standard with no range limits and a step of 1";
    			t6 = space();
    			td1 = element("td");
    			create_component(numberspinner0.$$.fragment);
    			t7 = space();
    			td2 = element("td");
    			t8 = text("Current value is ");
    			t9 = text(/*value1*/ ctx[0]);
    			t10 = space();
    			tr1 = element("tr");
    			td3 = element("td");
    			td3.textContent = "Range from 0 to 1000 and only horizontal dragging and arrow keys left/right will change the value";
    			t12 = space();
    			td4 = element("td");
    			create_component(numberspinner1.$$.fragment);
    			t13 = space();
    			td5 = element("td");
    			t14 = text("Current value is ");
    			t15 = text(/*value2*/ ctx[1]);
    			t16 = space();
    			tr2 = element("tr");
    			td6 = element("td");
    			td6.textContent = "Steps 0.01 and shows the values with a precision of 2 decimals";
    			t18 = space();
    			td7 = element("td");
    			create_component(numberspinner2.$$.fragment);
    			t19 = space();
    			td8 = element("td");
    			t20 = text("Current value is ");
    			t21 = text(/*value3*/ ctx[2]);
    			t22 = space();
    			tr3 = element("tr");
    			td9 = element("td");
    			td9.textContent = "Custom class given for individual styling:";
    			t24 = space();
    			td10 = element("td");
    			create_component(numberspinner3.$$.fragment);
    			t25 = space();
    			td11 = element("td");
    			t26 = text("Current value is ");
    			t27 = text(/*value4*/ ctx[3]);
    			t28 = space();
    			tr4 = element("tr");
    			td12 = element("td");
    			td12.textContent = "Retreiving the value using the input and change events";
    			t30 = space();
    			td13 = element("td");
    			create_component(numberspinner4.$$.fragment);
    			t31 = space();
    			td14 = element("td");
    			t32 = text("Current input value is ");
    			t33 = text(/*value5input*/ ctx[4]);
    			br1 = element("br");
    			t34 = text(" \n    Current change value is ");
    			t35 = text(/*value5change*/ ctx[5]);
    			add_location(h2, file, 13, 0, 229);
    			add_location(br0, file, 16, 76, 349);
    			add_location(p, file, 15, 0, 269);
    			attr_dev(td0, "class", "svelte-zaqjbn");
    			add_location(td0, file, 22, 4, 460);
    			attr_dev(td1, "class", "svelte-zaqjbn");
    			add_location(td1, file, 23, 4, 520);
    			attr_dev(td2, "class", "svelte-zaqjbn");
    			add_location(td2, file, 24, 4, 586);
    			attr_dev(tr0, "class", "svelte-zaqjbn");
    			add_location(tr0, file, 21, 2, 451);
    			attr_dev(td3, "class", "svelte-zaqjbn");
    			add_location(td3, file, 28, 4, 642);
    			attr_dev(td4, "class", "svelte-zaqjbn");
    			add_location(td4, file, 29, 4, 755);
    			attr_dev(td5, "class", "svelte-zaqjbn");
    			add_location(td5, file, 30, 4, 853);
    			attr_dev(tr1, "class", "svelte-zaqjbn");
    			add_location(tr1, file, 27, 2, 633);
    			attr_dev(td6, "class", "svelte-zaqjbn");
    			add_location(td6, file, 34, 4, 909);
    			attr_dev(td7, "class", "svelte-zaqjbn");
    			add_location(td7, file, 35, 3, 985);
    			attr_dev(td8, "class", "svelte-zaqjbn");
    			add_location(td8, file, 36, 4, 1085);
    			attr_dev(tr2, "class", "svelte-zaqjbn");
    			add_location(tr2, file, 33, 2, 900);
    			attr_dev(td9, "class", "svelte-zaqjbn");
    			add_location(td9, file, 40, 4, 1141);
    			attr_dev(td10, "class", "svelte-zaqjbn");
    			add_location(td10, file, 41, 4, 1198);
    			attr_dev(td11, "class", "svelte-zaqjbn");
    			add_location(td11, file, 42, 4, 1328);
    			attr_dev(tr3, "class", "svelte-zaqjbn");
    			add_location(tr3, file, 39, 2, 1132);
    			attr_dev(td12, "class", "svelte-zaqjbn");
    			add_location(td12, file, 46, 4, 1384);
    			attr_dev(td13, "class", "svelte-zaqjbn");
    			add_location(td13, file, 47, 4, 1453);
    			add_location(br1, file, 48, 44, 1660);
    			attr_dev(td14, "class", "svelte-zaqjbn");
    			add_location(td14, file, 48, 4, 1620);
    			attr_dev(tr4, "class", "svelte-zaqjbn");
    			add_location(tr4, file, 45, 2, 1375);
    			attr_dev(table, "class", "svelte-zaqjbn");
    			add_location(table, file, 20, 0, 441);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t2);
    			append_dev(p, br0);
    			append_dev(p, t3);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, table, anchor);
    			append_dev(table, tr0);
    			append_dev(tr0, td0);
    			append_dev(tr0, t6);
    			append_dev(tr0, td1);
    			mount_component(numberspinner0, td1, null);
    			append_dev(tr0, t7);
    			append_dev(tr0, td2);
    			append_dev(td2, t8);
    			append_dev(td2, t9);
    			append_dev(table, t10);
    			append_dev(table, tr1);
    			append_dev(tr1, td3);
    			append_dev(tr1, t12);
    			append_dev(tr1, td4);
    			mount_component(numberspinner1, td4, null);
    			append_dev(tr1, t13);
    			append_dev(tr1, td5);
    			append_dev(td5, t14);
    			append_dev(td5, t15);
    			append_dev(table, t16);
    			append_dev(table, tr2);
    			append_dev(tr2, td6);
    			append_dev(tr2, t18);
    			append_dev(tr2, td7);
    			mount_component(numberspinner2, td7, null);
    			append_dev(tr2, t19);
    			append_dev(tr2, td8);
    			append_dev(td8, t20);
    			append_dev(td8, t21);
    			append_dev(table, t22);
    			append_dev(table, tr3);
    			append_dev(tr3, td9);
    			append_dev(tr3, t24);
    			append_dev(tr3, td10);
    			mount_component(numberspinner3, td10, null);
    			append_dev(tr3, t25);
    			append_dev(tr3, td11);
    			append_dev(td11, t26);
    			append_dev(td11, t27);
    			append_dev(table, t28);
    			append_dev(table, tr4);
    			append_dev(tr4, td12);
    			append_dev(tr4, t30);
    			append_dev(tr4, td13);
    			mount_component(numberspinner4, td13, null);
    			append_dev(tr4, t31);
    			append_dev(tr4, td14);
    			append_dev(td14, t32);
    			append_dev(td14, t33);
    			append_dev(td14, br1);
    			append_dev(td14, t34);
    			append_dev(td14, t35);
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
    			if (!current || dirty & /*value1*/ 1) set_data_dev(t9, /*value1*/ ctx[0]);
    			const numberspinner1_changes = {};

    			if (!updating_value_1 && dirty & /*value2*/ 2) {
    				updating_value_1 = true;
    				numberspinner1_changes.value = /*value2*/ ctx[1];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			numberspinner1.$set(numberspinner1_changes);
    			if (!current || dirty & /*value2*/ 2) set_data_dev(t15, /*value2*/ ctx[1]);
    			const numberspinner2_changes = {};

    			if (!updating_value_2 && dirty & /*value3*/ 4) {
    				updating_value_2 = true;
    				numberspinner2_changes.value = /*value3*/ ctx[2];
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			numberspinner2.$set(numberspinner2_changes);
    			if (!current || dirty & /*value3*/ 4) set_data_dev(t21, /*value3*/ ctx[2]);
    			const numberspinner3_changes = {};

    			if (!updating_value_3 && dirty & /*value4*/ 8) {
    				updating_value_3 = true;
    				numberspinner3_changes.value = /*value4*/ ctx[3];
    				add_flush_callback(() => updating_value_3 = false);
    			}

    			numberspinner3.$set(numberspinner3_changes);
    			if (!current || dirty & /*value4*/ 8) set_data_dev(t27, /*value4*/ ctx[3]);
    			if (!current || dirty & /*value5input*/ 16) set_data_dev(t33, /*value5input*/ ctx[4]);
    			if (!current || dirty & /*value5change*/ 32) set_data_dev(t35, /*value5change*/ ctx[5]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(numberspinner0.$$.fragment, local);
    			transition_in(numberspinner1.$$.fragment, local);
    			transition_in(numberspinner2.$$.fragment, local);
    			transition_in(numberspinner3.$$.fragment, local);
    			transition_in(numberspinner4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(numberspinner0.$$.fragment, local);
    			transition_out(numberspinner1.$$.fragment, local);
    			transition_out(numberspinner2.$$.fragment, local);
    			transition_out(numberspinner3.$$.fragment, local);
    			transition_out(numberspinner4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(table);
    			destroy_component(numberspinner0);
    			destroy_component(numberspinner1);
    			destroy_component(numberspinner2);
    			destroy_component(numberspinner3);
    			destroy_component(numberspinner4);
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
    	validate_slots("App", slots, []);
    	let value1 = 100;
    	let value2 = 500;
    	let value3 = 3.28;
    	let value4 = 0.5;
    	let value5 = 50;
    	let value5input = value5;
    	let value5change = value5;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
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

    	const change_handler = ev => {
    		$$invalidate(5, value5change = ev.detail);
    	};

    	const input_handler = ev => {
    		$$invalidate(4, value5input = ev.detail);
    	};

    	$$self.$capture_state = () => ({
    		NumberSpinner: dist,
    		value1,
    		value2,
    		value3,
    		value4,
    		value5,
    		value5input,
    		value5change
    	});

    	$$self.$inject_state = $$props => {
    		if ("value1" in $$props) $$invalidate(0, value1 = $$props.value1);
    		if ("value2" in $$props) $$invalidate(1, value2 = $$props.value2);
    		if ("value3" in $$props) $$invalidate(2, value3 = $$props.value3);
    		if ("value4" in $$props) $$invalidate(3, value4 = $$props.value4);
    		if ("value5" in $$props) $$invalidate(6, value5 = $$props.value5);
    		if ("value5input" in $$props) $$invalidate(4, value5input = $$props.value5input);
    		if ("value5change" in $$props) $$invalidate(5, value5change = $$props.value5change);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		value1,
    		value2,
    		value3,
    		value4,
    		value5input,
    		value5change,
    		value5,
    		numberspinner0_value_binding,
    		numberspinner1_value_binding,
    		numberspinner2_value_binding,
    		numberspinner3_value_binding,
    		change_handler,
    		input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

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
