window.util = {
    /**
     * 通过id找数组中的索引
     * @param arr
     * @param id
     */
    find_index_by_id(arr, id) {
        return arr.findIndex(row => {
            return row.id == id;
        });
    },

    /**
     * 通过id删除数组中的元素
     * @param arr
     * @param id
     */
    delete_element_by_id(arr, id) {
        let i = this.find_index_by_id(arr, id);
        arr.splice(i, 1);
    },
};