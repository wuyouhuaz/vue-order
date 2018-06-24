var Event = new Vue();
//分页组件(作为子组件插入)
const Pagination = Vue.component('pagination', {
    template: `
        <div class="tabbar">
            <span class="totalpage" :totalPage="totalPage">共有{{totalPage}}页</span>
            <button :class="{'disabled': paging == 1}" @click="setCurrent(1)" class="firstpage">首页</button>
            <button :class="{'disabled': paging == 1}" @click="setCurrent(paging-1)" class="prepage">上一页</button>
            <div class="paging"><button v-for="p in grouplist" :class="{'active': paging == p.val}" @click="setCurrent(p.val)" class="pager">{{p.text}}</button></div>
            <button :class="{'disabled': paging == totalPage}" @click="setCurrent(paging+1)" class="nextpage">下一页</button>
            <button :class="{'disabled': paging == totalPage}" @click="setCurrent(totalPage)" class="lastpage">尾页</button>
        </div>
    `,
    data() {
        return {
            paging: this.currentPage
        }
    },
    props: {
        total: { // 数据总条数
            type: Number,
            default: 0
        },
        limit: { // 每页显示条数
            type: Number,
            default: 5,
        },
        currentPage: { // 当前页码
            type: Number,
            default: 1
        },
        maxPageBtn: { // 分页条数
            type: Number,
            default: 9
        },
        MAXLIST: {
            type: Number,
            default: 1000
        }
    },
    computed: {
        totalPage() { // 总页数
            if (this.total < this.MAXLIST) {
                return Math.ceil(this.total / this.limit);
            } else
                return Math.ceil(this.MAXLIST / this.limit);
        },
        grouplist() { // 获取分页页码
            let pageAmount = this.totalPage;
            let pageList = [];
            let start,
                end,
                middle = Math.ceil(this.maxPageBtn / 2),
                nearLeft = this.paging <= middle,
                nearRight = this.paging >= pageAmount - middle;
            if (nearLeft) {
                start = 1;
                end = this.maxPageBtn;
            } else if (nearRight) {
                start = pageAmount - this.maxPageBtn;
                end = pageAmount;
            } else {
                start = this.paging - middle + 1;
                end = this.paging + middle - 1;
            }
            if (start < 1) {
                start = 1;
            }
            if (end > pageAmount) {
                end = pageAmount;
            }
            for (let i = start; i <= end; i++) {
                pageList.push({
                    text: i,
                    val: i
                })
            }
            return pageList;
        }
    },
    methods: {
        setCurrent(idx) {
            if (this.paging != idx && idx > 0 && idx < this.totalPage + 1) {
                this.paging = idx;
                this.$emit('pagechange', this.paging);
            }
        }
    }
});
//封装的共有方法(mixin引入)
const AdminPage = {
    data() {
        return {
            error: [], // 验证失败的错误信息
            current: {}, // 正在编辑的行
            list: [], // 正在列出的数据（多行）
            show_form: false, // 是否显示表单
            keyword: '', // 搜索关键词
            timer: null,
            total: null,
            paging: 1,
            limit: 5,
        };
    },
    mounted() {
        this.read();
    },
    methods: {
        search(e) {
            if (e)
                e.preventDefault();

            let keyword = this.keyword;

            let param = {
                or: {
                    name: keyword
                }
            };
            http
                .post(`${this.model}/search`, param)
                .then(r => {
                    this.list = r.data.data;
                });
        },
        create(e) {
            e.preventDefault();

            if (!this.validate())
                return;

            let is_update = this.current.id;
            let action = is_update ?
                'update' :
                'create';
            http
                .post(`${this.model}/${action}`, this.current)
                .then(r => {
                    if (r.data.success) {
                        this.current = {};
                        if (!is_update)
                            this.list.push(r.data.data);
                    }
                });
        },
        remove(id) {

            if (!confirm('确定要删除吗？'))
                return;
            http
                .post(`${this.model}/delete`, {
                    id
                })
                .then(r => {
                    if (r.data.success) {
                        util.delete_element_by_id(this.list, id);
                    }
                });
        },
        read() {
            http
                .post(`${this.model}/read?page=${this.paging}&limit=${this.limit}`)
                .then(r => {
                    this.list = r.data.data;
                    this.total = r.data.total;
                });
        },
        validate(row) {
            row = row || this.current;
            this.error = [];
            this
                .validate_props
                .forEach(prop => {
                    // 如果prop等于name，相当于 this.validate_name()
                    let r = this['validate_' + prop]();
                    if (r === true)
                        return;
                    this
                        .error
                        .push(r);
                });

            // for (let key in row) {   console.log('key:', key); } let valid_name     =
            // this.validate_name(row.name); let valid_capacity =
            // this.validate_capacity(row.capacity);
            //
            // if (valid_name === true && valid_capacity === true)   return true;
            //
            // if (valid_name !== true)   this.error.push(valid_name); if (valid_capacity
            // !== true)   this.error.push(valid_capacity);

            return !this.error.length;
        },
        change_dish(row) {
            this.show_form = true;
            this.current = row;
        },
        pagechange(currentPage) {
            http
                .post(`${this.model}/read?page=${currentPage}&limit=${this.limit}`)
                .then(r => {
                    this.list = r.data.data;
                    this.total = r.data.total;
                });
        },
    },
    components: {
        'pagination': Pagination
    },
    watch: {
        keyword() {
            clearTimeout(this.timer);

            this.timer = setTimeout(() => {
                this.search();
            }, 300);
        }
    }
};

// 一级路由组件
const Home = Vue.component('home', {
    template: `
        <div>
            <h1 class="home-title">欢迎来到窝点食堂</h1>
            <div class = "admin-link col right">
                <router-link to='/admin/table'>后台管理</router-link>
                <router-link to="/login">管理员登录</router-link>
            </div>
            <div class="dish-list">
                <div class="row dish" v-for="dish in dish_list">
                    <div class="col-lg-4 thumbnail">
                        <img :src="dish.cover_url || default_cover_url">
                    </div>
                    <div class="col-lg-5 detail">
                        <div class="name">{{dish.name}}</div>
                        <div class="description">{{dish.description}}</div>
                        <div class="price">￥： {{dish.price}}</div>
                    </div>
                    <div class="col-lg-3 amount-set">
                        <button class="fa fa-plus" @click="dish.$count++"></button>
                        <input type="number" v-model="dish.$count">
                        <button class="fa fa-minus" @click="dish.$count>0?dish.$count--:0"></button>
                    </div>
                </div>
                <label class="table-num">桌号</label>
                <input type="number" v-model="table">
                <div :totalamount="totalamount" class="total-amount">总价：￥{{totalamount||0}}</div>
            </div>
            <button @click="toggle_cart" class="cart-btn fr"><i class="fa fa-shopping-cart"></i> 购物车</button>
            <button @click="submit_order" class="submit-order">提交订单</button>
            <shoppingcart 
                :show_cart="show_cart" 
                :dish_list="dish_list" 
                :totalamount="totalamount" 
                class="cart"></shoppingcart>
        </div>
    `,
    data() {
        return {
            dish_list: [],
            table_list: [],
            default_cover_url: 'http://biaoyansu.com/img/biaoyansu_logo.svg',
            order: {},
            table: null,
            show_cart: false
        };
    },
    computed: {
        totalamount() {
            let total = 0;
            if (JSON.stringify(this.dish_list) == "{}")
                return;
            for (let key in this.dish_list) {
                let dish = this.dish_list[key];
                total = total + parseFloat(dish.price) * parseFloat(dish.$count);
            }
            return total;
        }
    },
    methods: {
        read_dish() {
            http
                .post('dish/read', {
                    key_by: 'id'
                })
                .then(r => {
                    this.dish_list = r.data.data;
                    this.reset_order();
                });
        },
        submit_order() {
            this.prepare_order_info();
            if (this.totalamount <= 0) {
                alert("您还没有点餐···");
                return;
            }
            this.order.status = 'created';

            this
                .main_order_id()
                .then(id => {
                    if (id)
                        this.order.parent_id = id;

                    http
                        .post('order/create', this.order)
                        .then(r => {
                            if (r.data.success) {
                                this.reset_order();
                            }
                        });
                });
        },

        main_order_id() {
            return http
                .post('order/first', {
                    where: {
                        and: {
                            table_id: this.order.table_id,
                            status: 'created',
                            parent_id: null
                        }
                    }
                })
                .then(function (r) {
                    if (!r.data.data)
                        return false;
                    return r.data.data.id;
                });
        },

        reset_order() {
            this.order = {
                table_id: this.order.table_id
            };

            let list = this.dish_list;
            for (let key in list) {
                Vue.set(this.dish_list[key], '$count', 0);
            }
        },

        prepare_order_info() {
            let info = [];

            let list = this.dish_list;

            for (let key in list) {
                let dish = list[key];
                let count = dish.$count;
                if (!count)
                    continue;
                info.push({
                    dish_id: dish.id,
                    count: parseInt(count),
                });
            }
            this.order.dish_info = info;
            this.order.price = this.totalamount;
            this.order.table_id = this.table;
        },
        toggle_cart() {
            this.show_cart = !this.show_cart;
        },
    },

    mounted() {
        this.read_dish();
        document.documentElement.addEventListener("click", e => {
            if (e.target.closest(".cart") || e.target.classList.contains("cart-btn")) {
                this.show_cart = true;
            } else {
                this.show_cart = false;
            }
        });
    }
});

// 子组件，隶属于Home
const ShoppingCart = Vue.component('shoppingcart', {
    template: `
        <div>
            <div class="dish-list cart-box"  v-show="show_cart">
                <div class="cart-title">购物车</div>
                <div class="row dish" v-for="dish in dish_list">                    
                    <div class="col-lg-6 detail">
                        <div class="name">{{dish.name}}</div>
                        <div class="price">￥： {{dish.price}}</div>
                    </div>
                    <div class="col-lg-6 amount-set">
                        <button class="fa fa-plus" @click="dish.$count++"></button>
                        <input type="number" v-model="dish.$count">
                        <button class="fa fa-minus" @click="dish.$count>0?dish.$count--:0"></button>
                    </div>
                </div>
                <div :totalamount="totalamount" class="total-amount">总价：￥{{totalamount||0}}</div>
            </div>
        </div>
    `,
    data() {
        return {
            default_cover_url: 'http://biaoyansu.com/img/biaoyansu_logo.svg'
        };
    },
    props: ['dish_list', 'show_cart', 'totalamount'],
    methods: {
       
    }
})
// 一级路由组件
const Login = Vue.component('login', {
    template: `
        <div class="admin">
            <h1>登录</h1>
            <form @submit="login($event)" novalidate>
                <div v-if="error.length" class="error">
                    <div v-for="e in error">{{e}}</div>
                </div>
                <div class="input-wrap">
                    <label>用户名</label>
                    <input type="text" v-model="user.username">
                </div>
                <div class="input-wrap">
                    <label>密码</label>
                    <input type="password" v-model="user.password">
                </div>
                <div class="input-wrap">
                    <button>登录</button>
                </div>
            </form>
        </div>
  `,
    data() {
        return {
            error: [],
            user: {}
        };
    },
    methods: {
        login(e) {
            e.preventDefault();
            this.error = [];

            if (this.user.username != 'whh' || this.user.password != '123') {
                this
                    .error
                    .push('用户名或密码有误');
                return;
            }

            localStorage.setItem('logged_in', 1);
            router.push('/admin/table');

            // http   .post('user/login', this.user)   .then(r => {     r.data.data.token
            // });
        }
    },

    mounted() {}
});

// 一级路由组件
const Admin = Vue.component('admin', {
    template: `
    <div>
        <h2 class="admin-title">后台管理界面</h2>
        <div class="admin row">
            <div class="col-lg-2 nav">
                <router-link to="/">回到首页</router-link>
                <router-link to="/admin/table">桌号管理</router-link>
                <router-link to="/admin/dish">菜品管理</router-link>
                <router-link to="/admin/order">订单管理</router-link>
                <a @click="logout">登出</a>
            </div>
            <div class="col-lg-10 main">
                <router-view></router-view>
            </div>
        </div>
    </div>    
  `,
    methods: {
        logout() {
            loginout();
            router.push('/login');
        }
    }
});

// 二级路由组件，隶属于Admin
const AdminDish = Vue.component('admin-dish', {
    template: `
        <div>
            <h2 class="dish-title">菜品管理</h2>
            <div class="tool-set">
                <div class="sub-set">
                    <button @click="show_form = !show_form" class="create-dish">
                        <span v-if="show_form">取消</span>
                        <span v-else>创建菜品</span>
                    </button>
                </div>
                <div class="sub-set row col-lg-4 col-sm-12">
                    <form @submit="search($event)" class=" ">
                        <input type="search" v-model="keyword" placeholder="关键词">
                        <button type="submit" hidden>搜索</button>
                    </form>
                </div>
            </div>
            <form v-if="show_form" @submit="create($event)" novalidate>
                <div v-if="error.length" class="error">
                    <div v-for="e in error">{{e}}</div>
                </div>
                <div class="input-wrap">
                    <label>菜名</label>
                    <input type="text" v-model="current.name">
                </div>
                <div class="input-wrap">
                    <label>价格</label>
                    <input type="number" v-model="current.price">
                </div>
                <div class="input-wrap">
                    <label>描述</label>
                    <textarea v-model="current.description"></textarea>
                </div>
                <div class="input-wrap">
                    <label>封面地址</label>
                    <input type="url" v-model="current.cover_url">
                </div>
                    <div class="input-wrap">
                    <button>提交</button>
                </div>
            </form>
            <table v-if="list.length" class="list">
                <thead>
                    <tr>
                        <th>菜名</th>
                        <th>价格</th>
                        <th>描述</th>
                        <th>封面</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in list">
                        <td>{{row.name}}</td>
                        <td>{{row.price}}</td>
                        <td>{{row.description || '-' }}</td>
                        <td>
                            <img v-if="row.cover_url" :src="row.cover_url" :alt="row.name">
                            <span class="empty-holder" v-else>暂无封面</span>
                        </td>
                        <td>
                            <button @click="change_dish(row)" class="dish-update">更新</button>
                            <button @click="remove(row.id)" class="dish-delete">删除</button>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div v-else class="empty-holder">暂无内容</div>
            <pagination :total="total" :current-page='paging' @pagechange="pagechange"></pagination>
        </div>
  `,

    data() {
        return {
            model: 'dish',
            validate_props: [
                'cover_url', 'description', 'name', 'price'
            ], // 需要验证的属性
        };
    },

    methods: {
        validate_name(value) {
            value = value || this.current.name;
            const MAX_LENGTH = 255;
            if (!value)
                return '菜名为必填项';
            if (value.length >= MAX_LENGTH)
                return `此项最大长度为${MAX_LENGTH}`;
            return true;
        },

        validate_price(value) {
            value = value || this.current.price;
            if (value === '' || value === undefined || value < 0 || value > 1000000)
                return '不合法的价格';
            return true;
        },

        validate_cover_url(value) {
            value = value || this.current.cover_url;
            let re = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
            if (!value)
                return true;
            if (!re.test(value))
                return '不合法的地址';
            return true;
        },

        validate_description(value) {
            value = value || this.current.description;
            if (!value)
                return true;
            const MAX_LENGTH = 10000;
            if (value.length > MAX_LENGTH)
                return `此项最大长度为${MAX_LENGTH}`;
            return true;
        }
    },

    mounted() {
        this.read();
    },
    mixins: [AdminPage]
});

// 二级路由组件，隶属于Admin
const AdminTable = Vue.component('admin-table', {
    template: `
        <div>
            <h2 class="table-title">桌号管理</h2>
            <div class="tool-set">
                <div class="sub-set">
                    <button @click="show_form = !show_form" class="create-table">
                        <span v-if="show_form">取消</span>
                        <span v-else>创建桌号</span>
                    </button>
                </div>
                <div class="sub-set row col-lg-4 col-sm-12">
                    <form @submit="search($event)" class="">
                        <input type="search" v-model="keyword" placeholder="关键词">
                        <button type="submit" hidden>搜索</button>
                    </form>
                </div>
            
            </div>
            
            <form v-if="show_form" @submit="create($event)">
                <div v-if="error.length" class="error">
                    <div v-for="e in error">{{e}}</div>
                </div>
                <div class="input-wrap">
                    <label>桌号</label>
                    <input type="text" v-model="current.name">
                </div>
                <div class="input-wrap">
                    <label>座位数</label>
                    <input type="number" v-model="current.capacity">
                </div>
                    <div class="input-wrap">
                    <button>提交</button>
                </div>
            </form>
            
            <table class="list">
                <thead>
                    <tr>
                        <th>桌号</th>
                        <th>座位数</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in list">
                        <td>{{row.name}}</td>
                        <td>{{row.capacity}}</td>
                        <td>
                            <button @click="change_dish(row)">更新</button>
                            <button @click="remove(row.id)">删除</button>
                        </td>
                    </tr>
                </tbody>
            </table>
            <pagination :total="total" :current-page='paging' @pagechange="pagechange"></pagination>
        </div>
  `,
    data() {
        return {
            model: 'table',
            validate_props: ['name', 'capacity']
        };
    },
    methods: {
        validate_name(value) {

            value = value || this.current.name;

            const MAX_LENGTH = 255;

            if (!value)
                return '桌号为必填项';

            if (value.length >= MAX_LENGTH)
                return `此项最大长度为${MAX_LENGTH}`;

            return true;
        },
        validate_capacity(value) {
            value = value || this.current.capacity;

            if (!value)
                return '座位数为必填项';

            if (value < 1 || value > 1000000)
                return '不合法的座位数';

            return true;
        }
    },
    /**
     * 初始化
     */
    mounted() {
        this.read();
    },
    mixins: [AdminPage]
});

// 二级路由组件，隶属于Admin
const AdminOrder = Vue.component('admin-order', {
    template: `
        <div>
            <h2 class="order-title">订单管理</h2>
            <table v-if="list.length" class="list">
                <thead>
                    <tr>
                        <th>id</th>
                        <th>桌子</th>
                        <th>菜品详情</th>
                        <th>主单</th>
                        <th>总价</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in list">
                        <td>{{row.id}}</td>
                        <td>{{row.table_id}}</td>
                        <td>
                            <span v-for="dish in row.dish_info">
                                <span>菜品：{{dish.dish_id}}</span>
                                <span>数量：{{dish.count}}</span>
                            </span>
                        </td>
                        <td>{{ row.parent_id || '-' }}</td>
                        <td>￥: {{ row.price || 0 }}</td>
                        <td>
                            <select @change="change_status(row.id, row.status)" v-model="row.status" class="order-action">
                                <option v-for="status in status_list" :value="status.value">{{status.name}}</option>
                            </select>
                            <button @click="remove(row.id)" class="order-delete">删除</button>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div v-else class="empty-holder">暂无内容</div>
            <pagination :total="total" :current-page='paging' @pagechange="pagechange"></pagination>
        </div>
  `,

    data() {
        return {
            model: 'order',
            validate_props: [
                'cover_url', 'description', 'name', 'price'
            ], // 需要验证的属性
            status_list: [{
                name: '进行中',
                value: 'created'
            }, {
                name: '已支付',
                value: 'paid'
            }, {
                name: '已关闭',
                value: 'closed'
            }, {
                name: '已取消',
                value: 'canceled'
            }]
        };
    },

    methods: {
        change_status(id, status) {
            http.post('order/update', {
                id,
                status
            });
        },

        validate_name(value) {

            value = value || this.current.name;

            const MAX_LENGTH = 255;

            if (!value)
                return '菜名为必填项';

            if (value.length >= MAX_LENGTH)
                return `此项最大长度为${MAX_LENGTH}`;

            return true;
        },

        validate_price(value) {
            value = value || this.current.price;

            if (value === '' || value === undefined || value < 0 || value > 1000000)
                return '不合法的价格';

            return true;
        },

        validate_cover_url(value) {
            value = value || this.current.cover_url;

            let re = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;

            if (!value)
                return true;

            if (!re.test(value))
                return '不合法的地址';

            return true;
        },

        validate_description(value) {
            value = value || this.current.description;

            if (!value)
                return true;

            const MAX_LENGTH = 10000;
            if (value.length > MAX_LENGTH)
                return `此项最大长度为${MAX_LENGTH}`;

            return true;
        },

        read() {
            http
                .post(`order/read?page=${this.paging}&limit=${this.limit}`, {
                    with: 'belongs_to:table',
                    where: {
                        and: {
                            // parent_id : null,
                        }
                    }
                })
                .then(r => {
                    this.list = r.data.data;
                    this.total = r.data.total;
                });
        }
    },
    mixins: [AdminPage]
});
// 定义路由
var router = new VueRouter({
    routes: [{
        path: '/',
        component: Home
    }, {
        path: '/login',
        component: Login
    }, {
        path: '/admin/',
        component: Admin,
        children: [{
            path: 'dish',
            component: AdminDish
        }, {
            path: 'table',
            component: AdminTable
        }, {
            path: 'order',
            component: AdminOrder
        }]
    }]
});
// 设置权限管理，在未登录的时候跳到登录界面
router.beforeEach((to, from, next) => {
    let is_logged_in = logged_in();
    let going_admin_page = /^\/admin/.test(to.path);
    if (going_admin_page) {
        if (is_logged_in) {
            next();
        } else {
            router.push('/login');
        }
    } else {
        next();
    }
});

function logged_in() {
    return !!localStorage.getItem('logged_in');
}

function loginout() {
    localStorage.removeItem('logged_in');
}

new Vue({
    el: '#root',
    router: router
});

// http.post('MODEL/CREATE_PROPERTY', {     model: 'order',     property:
// 'memo',     structure: [{         type: 'text',         nullable: true, }, ],
// });
// http.post('MODEL/READ', {});