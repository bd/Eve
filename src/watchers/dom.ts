import {Watcher, RawValue, RawEAV, RawEAVC, _isId, asJS} from "./watcher";
import {v4 as uuid} from "uuid";

import naturalSort = require("javascript-natural-sort");

export interface Map<V>{[key:string]: V}

export interface Style extends Map<RawValue|undefined> {__size: number}
export interface ElemInstance extends Element {__element?: RawValue, __styles?: RawValue[], __sort?: RawValue, style?: any, listeners?: {[event:string]: boolean}}

export abstract class DOMWatcher<Instance extends ElemInstance> extends Watcher {
  styles:Map<Style|undefined> = Object.create(null);
  roots:Map<Instance|undefined> = Object.create(null);
  instances:Map<Instance|undefined> = Object.create(null);
  elementToInstances:Map<RawValue[]|undefined> = Object.create(null);
  styleToInstances:Map<RawValue[]|undefined> = Object.create(null);

  abstract tagPrefix:string;
  abstract createInstance(id:RawValue, element:RawValue, tagname:RawValue):Instance;
  abstract getInstance(id:RawValue):Instance|undefined;
  abstract createRoot(id:RawValue):Instance|undefined;
  abstract addAttribute(instance:Instance, attribute:RawValue, value:RawValue|boolean):void;
  abstract removeAttribute(instance:Instance, attribute:RawValue, value:RawValue|boolean):void;

  protected _dummy:HTMLElement;

  protected _sendEvent(eavs:(RawEAV|RawEAVC)[]) {
    this.program.inputEAVs(eavs);
  }

  getStyle(id:RawValue) {
    return this.styles[id] = this.styles[id] || {__size: 0};
  }

  isInstance(elem?:any): elem is Instance {
    if(!elem || !(elem instanceof Element)) return false;
    let instance = elem as Instance;
    return instance && !!instance["__element"];
  }

  addInstance(id:RawValue, element:RawValue, tagname:RawValue):Instance|undefined {
    let instance = this.instances[id] = this.createInstance(id, element, tagname);
    if(!this.elementToInstances[element]) this.elementToInstances[element] = [];
    this.elementToInstances[element]!.push(id);
    return instance;
  }

  clearInstance(id:RawValue) {
    let instance = this.instances[id];
    if(instance && instance.parentElement) {
      instance.parentElement.removeChild(instance);
    }
    this.instances[id] = undefined;

    let instances = instance && this.elementToInstances[instance.__element!];
    if(instances) instances.splice(instances.indexOf(id), 1);
  }

  getRoot(id:RawValue, tagname:RawValue = "div"):Instance|undefined {
    return this.roots[id] = this.roots[id];
  }

  clearRoot(id:RawValue) {
    this.clearInstance(id);
    this.roots[id] = undefined;
  }

  insertChild(parent:Element|null, child:Instance, at = child.__sort) {
    child.__sort = at
    if(at !== undefined) child.setAttribute("sort", ""+at);
    if(!parent) return;

    let current;
    for(let curIx = 0; curIx < parent.childNodes.length; curIx++) {
      let cur = parent.childNodes[curIx] as Instance;
      if(cur === child) continue;
      if(cur.__sort !== undefined && at !== undefined && naturalSort(cur.__sort, at) > 0) {
        current = cur;
        break;
      }
    }

    if(current) {
      parent.insertBefore(child, current);
    } else {
      parent.appendChild(child);
    }
  }

  insertSortedChild(parent:Element|null, child:Instance, sort?:RawValue) {
    child.__sort = sort;
    if(sort !== undefined) child.setAttribute("sort", ""+sort);
    else child.removeAttribute("sort");
    this.insertChild(parent, child);
  }

  insertAutoSortedChild(parent:Element|null, child:Instance, autoSort?:RawValue) {
    if(autoSort !== undefined) {
      child.setAttribute("auto-sort", ""+autoSort);
      if(!child.hasAttribute("sort")) {
        child.__sort = autoSort;
        this.insertChild(parent, child);
      }
    }
    else child.removeAttribute("auto-sort");
  }

  // @NOTE: This requires styles to have disjoint attribute sets or it'll do bad things.
  // @NOTE: Styles may only have a single value for each attribute due to our inability
  //        to express an ordering of non-record values.
  setStyleAttribute(styleId:RawValue, attribute:RawValue, value:RawValue, count:-1|1) {
    let style = this.getStyle(styleId);
    if(count === -1) {
      //if(!style[attribute]) throw new Error(`Cannot remove non-existent attribute '${attribute}'`);
      //if(style[attribute] !== value) throw new Error(`Cannot remove mismatched AV ${attribute}: ${value} (current: ${style[attribute]})`);
      style[attribute] = undefined;
    } else {
      if(style[attribute]) throw new Error(`Cannot add already present attribute '${attribute}'`);
      style[attribute] = value;
    }
    style.__size += count;

    // Update all existing instances with this style.
    let instances = this.styleToInstances[styleId];
    if(instances) {
      for(let instanceId of instances) {
        let instance = this.getInstance(instanceId);
        if(!instance) {
          // We may have removed one instance of multiple subscribed to this style.
          continue;
        }
        instance.style[attribute as any] = style[attribute] as any;
      }
    }
  }

  addStyleInstance(styleId:RawValue, instanceId:RawValue) {
    let instance = this.getInstance(instanceId);
    if(!instance) throw new Error(`Orphaned instance '${instanceId}'`);
    let style = this.getStyle(styleId);

    // Instead of a style record, we may be dealing with a style string.
    if(style.__size === 0) {
      this._dummy.setAttribute("style", styleId as string);
      let props = this._dummy.style;
      // Yep, we're inline CSS.
      if(props.length) {
        this.styles[styleId] = style;

        for(let propIx = 0; propIx < props.length; propIx++) {
          let prop = props[propIx];
          let value = props.getPropertyValue(prop);
          style[prop] = value;
          style.__size += 1;
        }
      }
    }

    for(let prop in style) {
      if(prop === "__size") continue;
      instance.style[prop as any] = style[prop] as string;
    }
    if(this.styleToInstances[styleId]) this.styleToInstances[styleId]!.push(instanceId);
    else this.styleToInstances[styleId] = [instanceId];

    if(!instance.__styles) instance.__styles = [];
    if(instance.__styles.indexOf(styleId) === -1) instance.__styles.push(styleId);
  }

  removeStyleInstance(styleId:RawValue, instanceId:RawValue) {
    let instance = this.getInstance(instanceId);
    if(!instance) return;
    instance.removeAttribute("style");
    let ix = instance.__styles!.indexOf(styleId);
    instance.__styles!.splice(ix, 1);

    for(let otherStyleId of instance.__styles!) {
      let style = this.getStyle(otherStyleId);
      for(let prop in style) {
        if(prop === "__size") continue;
        instance.style[prop as any] = style[prop] as string;
      }
    }
  }

  setup() {
    if(typeof document === "undefined") return;
    this._dummy = document.createElement("div");

    this.program
      .constants({tagPrefix: this.tagPrefix})
      .commit("Remove click events!", ({find}) => {
        let click = find("{{tagPrefix}}/event/click");
        return [click.remove()];
      })

      .bind("Create instances for each root.", ({find, record, lib}) => {
        let elem = find("{{tagPrefix}}/root");
        return [
          record("{{tagPrefix}}/instance", {element: elem, tagname: elem.tagname})
        ];
      })

      .bind("Create an instance for each child of a rooted parent.", ({find, record, lib}) => {
        let elem = find("{{tagPrefix}}/element");
        let parentElem = find("{{tagPrefix}}/element", {children: elem});
        let parent = find("{{tagPrefix}}/instance", {element: parentElem});

        return [
          record("{{tagPrefix}}/instance", {element: elem, tagname: elem.tagname, parent})
        ];
      })
      .watch("Export all instances.", ({find, record}) => {
        let instance = find("{{tagPrefix}}/instance");
        return [
          record({tagname: instance.tagname, element: instance.element, instance})
        ];
      })

      .asObjects<{tagname:string, element:string, instance:string}>((diff) => {
        for(let e of Object.keys(diff.removes)) {
          let {instance:instanceId} = diff.removes[e];
          this.clearInstance(instanceId);

        }

        for(let e of Object.keys(diff.adds)) {
          let {instance:instanceId, tagname, element} = diff.adds[e];
          this.addInstance(instanceId, element, tagname);
        }
      })

      .watch("Export roots.", ({find, record}) => {
        let root = find("{{tagPrefix}}/root");
        let instance = find("{{tagPrefix}}/instance", {element: root});
        return [
          record({instance})
        ];
      })
      .asDiffs((diff) => {
        for(let [e, a, rootId] of diff.removes) {
          this.clearRoot(rootId);
        }
        for(let [e, a, rootId] of diff.adds) {
          this.roots[rootId] = this.createRoot(rootId);
        }
      })

      .watch("Export instance parents.", ({find, record}) => {
        let instance = find("{{tagPrefix}}/instance");
        return [
          record({instance, parent: instance.parent})
        ];
      })
      .asObjects<{instance:string, parent:string}>((diff) => {
        for(let e of Object.keys(diff.removes)) {
          let {instance:instanceId, parent:parentId} = diff.removes[e];
          let instance = this.getInstance(instanceId);
          let parent = this.getInstance(parentId);
          if(!instance || !parent) continue;

          if(instance && instance.parentElement) {
            instance.parentElement.removeChild(instance);
          }

        }
        for(let e of Object.keys(diff.adds)) {
          let {instance:instanceId, parent:parentId} = diff.adds[e];
          let instance = this.getInstance(instanceId);
          if(!instance) throw new Error(`Orphaned instance '${instanceId}'`);
          let parent = this.getInstance(parentId);
          if(!parent) throw new Error(`Missing parent instance '${parentId}', ${instanceId}`);
          this.insertChild(parent, instance);
        }
      })

      .watch("Export element styles.", ({find, record, lib, lookup}) => {
        let elem = find("{{tagPrefix}}/element");
        let style = elem.style;
        let {attribute, value} = lookup(style);
        return [
          style.add(attribute, value)
        ];
      })
      .asDiffs((diff) => {
        let maybeGC = [];
        for(let [styleId, a, v] of diff.removes) {
          maybeGC.push(styleId);
          this.setStyleAttribute(styleId, a, v, -1);
        }


        for(let [styleId, a, v] of diff.adds) {
          this.setStyleAttribute(styleId, a, v, 1);
        }

        for(let styleId of maybeGC) {
          let style = this.getStyle(styleId);
          if(style.__size === 0) {
            this.styles[styleId] = undefined;
          }
        }
      })

      .watch("Export element attributes.", ({find, record, lookup}) => {
        let instance = find("{{tagPrefix}}/instance");
        let elem = instance.element;
        let {attribute, value} = lookup(elem);
        attribute != "class";
        return [
          instance.add(attribute, value)
        ];
      })
      .asDiffs((diff) => {
        for(let [e, a, v] of diff.removes) {
          let instance = this.getInstance(e);
          if(!instance) continue;

          else if(a === "tagname") continue;
          else if(a === "children") continue;
          else if(a === "tag") continue;
          else if(a === "sort") continue; // I guess..?
          else if(a === "eve-auto-index") continue; // I guess..?
          else if(a === "text") instance.textContent = null;
          else if(a === "style") this.removeStyleInstance(v, e);
          else this.removeAttribute(instance, a, asJS(v)!);
        }

        for(let [e, a, v] of diff.adds) {
          let instance = this.getInstance(e);
          if(!instance) throw new Error(`Orphaned instance '${e}'`);

          else if((a === "tagname")) continue;
          else if(a === "children") continue;
          else if(a === "tag") continue;
          else if(a === "sort") this.insertSortedChild(instance.parentElement, instance, v);
          else if(a === "eve-auto-index") this.insertAutoSortedChild(instance.parentElement, instance, v);
          else if(a === "text") instance.textContent = ""+v;
          else if(a === "style") this.addStyleInstance(v, e);
          else this.addAttribute(instance, a, asJS(v)!);
        }
      })

      .watch("Export static classes.", ({find, not, lookup}) => {
        let instance = find("{{tagPrefix}}/instance");
        let elem = instance.element;
        let klass = elem.class;
        not(() => lookup(klass));

        return [instance.add("class", klass)];
      })
      .asDiffs((diff) => {
        for(let [e, a, v] of diff.removes) {
          let instance = this.getInstance(e);
          if(!instance) continue;

          for(let klass of (""+v).split(" ")) {
            if(!klass) continue;
            instance.classList.remove(klass);
          }
        }

        for(let [e, a, v] of diff.adds) {
          let instance = this.getInstance(e);
          if(!instance) throw new Error(`Orphaned instance '${e}'`);

          for(let klass of (""+v).split(" ")) {
            if(!klass) continue;
            instance.classList.add(klass);
          }
        }
      })

      .bind("Elements with a dynamic class record apply classes for each true attribute.", ({find, lookup, record}) => {
        let element = find("{{tagPrefix}}/element");
        let {attribute, value} = lookup(element.class);
        value == "true";
        return [
          element.add("class", attribute)
        ];
      });
  }
}
