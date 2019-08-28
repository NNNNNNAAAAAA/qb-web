import 'axios';
import Axios, {AxiosInstance, AxiosResponse, AxiosError} from 'axios';

class Api {
    private axios: AxiosInstance;

    constructor() {
        this.axios = Axios.create({
            baseURL: '/api/v2'
        });

        this.axios.defaults.headers.post['Content-Type'] =
            'application/x-www-form-urlencoded';
    }

    public getAppVersion() {
        return this.axios.get('/app/version');
    }

    public getApiVersion() {
        return this.axios.get('/app/webapiVersion');
    }

    public login(params: any) {
        const data = new URLSearchParams(params);
        return this.axios
            .post('/auth/login', data, {
                validateStatus(status) {
                    return status === 200 || status === 403;
                }
            })
            .then(this.handleResponse);
    }

    public getGlobalTransferInfo() {
        return this.axios.get('/transfer/info');
    }

    public getAppPreferences() {
        return this.axios.get('/app/preferences');
    }

    public getMainData(rid?: number) {
        const params = {
            rid
        };
        return this.axios.get('/sync/maindata', {
            params
        });
    }

    public addTorrents(params: any, torrents?: any) {
        let data: any;
        if (torrents) {
            const formData = new FormData();
            for (const [key, value] of Object.entries(params)) {
                formData.append(key, value);
            }

            for (const torrent of torrents) {
                formData.append('torrents', torrent);
            }

            data = formData;
        } else {
            data = new URLSearchParams(params);
        }
        return this.axios.post('/torrents/add', data).then(this.handleResponse);
    }

    public switchToOldUi() {
        const params = {
            alternative_webui_enabled: false
        };

        const data = new URLSearchParams({
            json: JSON.stringify(params)
        });

        return this.axios.post('/app/setPreferences', data);
    }

    public getLogs(lastId?: number) {
        const params = {
            last_known_id: lastId
        };

        return this.axios
            .get('/log/main', {
                params
            })
            .then(this.handleResponse);
    }

    public toggleSpeedLimitsMode() {
        return this.axios.post('/transfer/toggleSpeedLimitsMode');
    }

    public deleteTorrents(hashes: string[], deleteFiles: boolean) {
        return this.actionTorrents('delete', hashes, {deleteFiles});
    }

    public pauseTorrents(hashes: string[]) {
        return this.actionTorrents('pause', hashes);
    }

    public resumeTorrents(hashes: string[]) {
        return this.actionTorrents('resume', hashes);
    }

    public reannounceTorrents(hashes: string[]) {
        return this.actionTorrents('reannounce', hashes);
    }

    public recheckTorrents(hashes: string[]) {
        return this.actionTorrents('recheck', hashes);
    }

    public setTorrentsCategory(hashes: string[], category: string) {
        return this.actionTorrents('setCategory', hashes, {category});
    }

    public setTorrentsAutomatic(hashes: string[], enable: boolean) {
        return this.actionTorrents('setAutoManagement', hashes, {enable});
    }

    public getTorrentTracker(hash: string) {
        const params = {
            hash
        };

        return this.axios
            .get('/torrents/trackers', {
                params
            })
            .then(this.handleResponse);
    }

    public getTorrentPeers(hash: string, rid?: number) {
        const params = {
            hash,
            rid
        };

        return this.axios
            .get('/sync/torrentPeers', {
                params
            })
            .then(this.handleResponse);
    }

    private actionTorrents(action: string, hashes: string[], extra?: any) {
        const params: any = {
            hashes: hashes.join('|'),
            ...extra
        };
        const data = new URLSearchParams(params);
        return this.axios
            .post('/torrents/' + action, data)
            .then(this.handleResponse);
    }

    public actionRss(action: string, params: any = {}) {
        return this.axios
            .post(`/rss/${action}`, new URLSearchParams(params))
            .then(this.handleResponse);
    }

    public action(action: string, params: any = {}) {
        return this.axios
            .post(`/${action}`, new URLSearchParams(params))
            .then(this.handleResponse);
    }

    private handleResponse(resp: AxiosResponse) {
        return resp.data;
    }
}

export const api = new Api();
