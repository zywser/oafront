import axios from "axios";
import { useAuthStore } from "@/stores/auth";



class Http{
    constructor(){
        this.instance = axios.create({
            baseURL: import.meta.env.VITE_BASE_URL,
            // 联网类问答耗时较长（内部检索 + 联网搜索 + LLM 生成，可达 20~40s），
            // 超时不能设太短，否则 axios 会在生成完成前抛超时错误。
            timeout: 60000,
            // headers: {'X-Custom-Header': 'foobar'}
            
        });

        this.instance.interceptors.request.use((config)=>{
            const authStore = useAuthStore()
            const token = authStore.token
            if(token){
                config.headers.Authorization = "JWT " + token
            }
            return config

        })
    }





    post(path,data){
        // return this.instance.post(path,data)

        return new Promise(async (resolve,reject) =>{
            //await:网络请求发出后，线程会挂起这个等待
            //等待网络数据到达后，线程又会回到当前位置开始执行
            //如果在某个函数中使用了await,那么这个函数就必须定义成async
            //axios底层也是Promise对象，在响应码不是200的时候，就会调用reject
            //第哦啊用reject的结果是，外层函数会抛出异常
           try{
            let result = await this.instance.post(path,data)
            // 如果走到下面这个代码，说明await没有抛出异常就肯定说明返回的状态码是200

            resolve(result.data)

           }catch(err){
            // 走到catch中，状态码肯定不是200
               let detail = err?.response?.data?.detail||"网络错误"
               reject(detail)
               

           }
        })
    }

    get(path,params){

        return new Promise(async(resolve,reject)=>{
            try{

                let result = await this.instance.get(path,{params})
                resolve(result.data)
            }catch(err){
                let detail = err?.response?.data?.detail || "网络错误"
                reject(detail)

            }



        })
    }

    put(path,data){
        return new Promise(async (resolve,reject) =>{
           try{
            let result = await this.instance.put(path,data)
            resolve(result.data)
           }catch(err){
               let detail = err?.response?.data?.detail||"网络错误"
               reject(detail)   
           }
        })
    }



     delete(path,data){
        return new Promise(async (resolve,reject) =>{
           try{
            let result = await this.instance.delete(path)
            // 因为服务端的delete方法，只是返回一个状态码，并没有数据，所以直接把result返回回去就可以了
            resolve(result.data)
           }catch(err){
               let detail = await err?.response?.data?.detail||"网络错误"
               reject(detail)   
           }
        })
    }


    downloadFile(path,params){
         return new Promise(async(resolve,reject)=>{
            try{

                let result = await this.instance.get(path,{
                    params,
                    responseType:"blob"
                })
                resolve(result)
            }catch(err){
                let detail = err.response.data.detail
                reject(detail)
            }
        })
    }



}





export default new Http
