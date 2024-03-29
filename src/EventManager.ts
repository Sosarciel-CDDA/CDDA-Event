
import { AnyString, JObject, UtilFT, UtilFunc, stringifyJToken } from "@zwa73/utils";
import { AnyHook, genDefineHookMap, GlobalHook, HookObj, HookOpt} from "./EventInterface";
import { Eoc, EocEffect, EocID } from "cdda-schema";


/**事件效果 */
type EventEffect = {
    /**eoc效果 */
    effects:EocEffect[];
    /**排序权重 */
    weight:number;
}
export class EventManager {
    private _hookMap:Record<AnyHook|AnyString,HookObj>;
    private _effectsMap:Partial<Record<AnyHook|AnyString,EventEffect[]>> = {};
    private _prefix:string;
    constructor(prefix:string,opt?:Partial<HookOpt>){
        this._hookMap=genDefineHookMap(prefix,opt);
        this._prefix = prefix;
    }
    /**导出 */
    build(){
        const json:JObject[] = [];
        //加入effect
        for(const key in this._hookMap){
            const fixkey = key as AnyHook;
            const hookObj = this._hookMap[fixkey];
            //加入effect
            let elist = this._effectsMap[fixkey]||[];
            elist.sort((a,b)=>b.weight-a.weight);

            //格式化为effect
            const eventeffects:EocEffect[] = [];
            elist.forEach((e)=>eventeffects.push(...e.effects));

            //合并if
            function mergeIf(effects:EocEffect[]){
                const merges:EocEffect[]=[];
                effects.forEach((curre)=>{
                    const laste = merges[merges.length-1];
                    if( typeof laste == "object" && 'if' in laste && Array.isArray(laste.then) &&
                        typeof curre == "object" && 'if' in curre && Array.isArray(curre.then) &&
                        stringifyJToken(laste.if) == stringifyJToken(curre.if)){
                            laste.then.push(...curre.then);
                            laste.then = mergeRuneocs(laste.then);
                    }else
                        merges.push(curre)
                })
                return merges;
            }
            //合并runeocs
            function mergeRuneocs(effects:EocEffect[]){
                const merges:EocEffect[]=[];
                effects.forEach((curre)=>{
                    const laste = merges[merges.length-1];
                    if( typeof laste == "object" && 'run_eocs' in laste && Array.isArray(laste.run_eocs) &&
                        typeof curre == "object" && 'run_eocs' in curre && Array.isArray(curre.run_eocs)){
                            laste.run_eocs.push(...curre.run_eocs)
                    }else
                        merges.push(curre)
                })
                return merges;
            }
            //合并
            const mergeeffects = mergeRuneocs(mergeIf(eventeffects));

            const eoc:Eoc = {
                type:"effect_on_condition",
                ...hookObj.base_setting,
                id:`${this._prefix}_${key}_EVENT` as EocID,
                effect:[...hookObj.before_effects??[],...mergeeffects,...hookObj.after_effects??[]]
            }
            //整合eoc数组
            json.push(eoc);
        }
        return json;
    }
    /**添加事件  
     * @param hook - 触发时机
     * @param weight - 权重 越大优先级越高
     * @param effects - 触发效果
     */
    addEvent(hook:AnyHook|AnyString,weight:number,effects:EocEffect[]){
        this.verifyHook(hook);
        this._effectsMap[hook] = this._effectsMap[hook]??[];
        const list = this._effectsMap[hook];
        list?.push({effects,weight})
    }
    /**添加调用eocid事件  
     * @param hook - 触发时机
     * @param weight - 权重 越大优先级越高
     * @param eocids - 触发效果id
     */
    addInvokeID(hook:AnyHook|AnyString,weight:number,...eocids:EocID[]){
        this.verifyHook(hook);
        this._effectsMap[hook] = this._effectsMap[hook]??[];
        const list = this._effectsMap[hook];
        list?.push({effects:[{run_eocs:eocids}],weight})
    }
    /**添加调用eoc事件  
     * @param hook - 触发时机
     * @param weight - 权重 越大优先级越高
     * @param eocs - 触发效果对象
     */
    addInvokeEoc(hook:AnyHook|AnyString,weight:number,...eocs:Eoc[]){
        return this.addInvokeID(hook,weight,...eocs.map((item)=>item.id));
    }
    /**添加自定义的Hook */
    addHook(hook:string,eoc:HookObj){
        this._hookMap[hook] = eoc;
    }
    /**获得hook设定 */
    getHookObj(hook:string){
        this.verifyHook(hook);
        return this._hookMap[hook];
    }
    /**验证hook是否存在 */
    private verifyHook(hook:string){
        if(this._hookMap[hook]==null) throw `hook:${hook} 不存在`;
    }
    /**获取前缀 */
    getPrefix(){
        return this._prefix;
    }
}