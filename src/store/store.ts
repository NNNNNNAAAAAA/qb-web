import Vue from 'vue';
import Vuex from 'vuex';
import _ from 'lodash';
import {AllStateTypes} from '@/consts';
import {torrentIsState} from '@/utils';
import {api} from '@/Api';
import dayjs from 'dayjs';

import rss from './modules/rss';
import category from './modules/category';
import tag from './modules/tag';

Vue.use(Vuex);

const defaultConfig = {
    updateInterval: 2000,
    pagination: {
        rowsPerPage: 1000
    },
    filter: {
        state: null,
        category: null,
        site: null
    }
};

const configKey = 'qb-config';

function saveConfig(obj: any) {
    localStorage[configKey] = JSON.stringify(obj);
}

function loadConfig() {
    const tmp = localStorage[configKey];
    if (!tmp) {
        return {};
    }

    return JSON.parse(tmp);
}

export default new Vuex.Store({
    state: {
        rid: 0,
        mainData: null,
        userConfig: loadConfig(),
        preferences: {},
        dialogs: {
            add: {
                open: false,
                params: {},
            },
        },
        addParams: {},
    },
    modules: {
        rss,
        category,
        tag,
    },
    actions: {
        async getPreferences({commit}) {
            const resp = await api.getAppPreferences();
            commit('updatePreferences', resp.data);
        },
        async setPreferences({commit, state}, payload: object = {}) {
            const newPrefs = {
                ...state.preferences,
                ...payload,
            };
            await api.action('app/setPreferences', {json: JSON.stringify(newPrefs)});
            return commit('updatePreferences', newPrefs);
        },
        async getAllData({commit, state}) {
            const rid = state.rid ? state.rid : null;
            const resp = await api.getMainData(rid);
            commit('updateMainData', resp.data);
        },
    },
    mutations: {
        dialogAction(state, {key, value, params} = {}) {
            state.dialogs[key] = _.isUndefined(value) ? !state.dialogs[key] : value;
            state.dialogs[key] = {
                open: _.isUndefined(value) ? !_.get(state, ['dialogs', key, 'open'], false) : value,
                params,
            };
        },
        updateMainData(state, payload) {
            state.rid = payload.rid;
            if (payload.full_update) {
                state.mainData = payload;
            } else {
                const tmp: any = _.cloneDeep(state.mainData);
                if (payload.torrents_removed) {
                    for (const hash of payload.torrents_removed) {
                        delete tmp.torrents[hash];
                    }
                    delete payload.torrents_removed;
                }
                if (payload.categories_removed) {
                    for (const key of payload.categories_removed) {
                        delete tmp.categories[key];
                    }
                    delete payload.categories_removed;
                }
                if (payload.tags_removed) {
                    _.remove(tmp.tags, tag => {
                        return _.indexOf(payload.tags_removed, tag) >= 0;
                    });
                    delete payload.tags_removed;
                }
                if (payload.tags) {
                    tmp.tags = tmp.tags.concat(payload.tags);
                    delete payload.tags;

                }
                state.mainData = _.merge(tmp, payload);
            }
        },
        updatePreferences(state, payload) {
            state.preferences = payload;
        },
        updateConfig(state, payload) {
            const key = payload.key;
            const value = payload.value;
            const tmp = _.merge({}, state.userConfig[key], value);
            Vue.set(state.userConfig, key, tmp);

            saveConfig(state.userConfig);
        },
        updateState(state, {key = '', val}) {
            if (key) {
                _.set(state, key, val);
            }
        },
    },
    getters: {
        config(state) {
            return _.merge({}, defaultConfig, state.userConfig);
        },
        isDataReady(state) {
            return !!state.mainData;
        },
        allTorrents(state) {
            if (!state.mainData) {
                return [];
            }

            return _.map(state.mainData.torrents, (value, key) => {
                return _.merge({}, value, {hash: key});
            });
        },
        allSavePaths(state,getters) {
            return _.chain(getters.allTorrents).map(t => t.save_path).compact().value();
        },
        torrentGroupBySite(state, getters) {
            return _.groupBy(getters.allTorrents, torrent => {
                if (!torrent.tracker) {
                    return '';
                }
                const url = new URL(torrent.tracker);
                return url.hostname;
            });
        },
        torrentGroupByState(__, getters) {
            const result: any = {};
            const put = (state: any, torrent: any) => {
                let list: any[] = result[state];
                if (!list) {
                    list = [];
                    result[state] = list;
                }
                list.push(torrent);
            };

            for (const torrent of getters.allTorrents) {
                for (const type of AllStateTypes) {
                    if (torrentIsState(type, torrent.state)) {
                        put(type, torrent);
                    }
                }
            }

            return result;
        }
    }
});
