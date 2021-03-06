<template>
<v-layout
  v-bind="topLayoutBind"
  v-if="isDataReady">
  <v-flex shrink v-if="app">
    <v-layout
      :align-center="!phoneLayout"
    >
      <v-flex v-if="!phoneLayout">
        <v-tooltip top lazy>
          <template v-slot:activator="{ on }">
            <span v-on="on">
              qBittorrent {{ app.version }}
            </span>
          </template>
          <span>
            API版本 {{ app.apiVersion }}
          </span>
        </v-tooltip>
      </v-flex>
      <v-divider vertical class="mx-2" v-if="!phoneLayout"/>
      <v-flex class="icon-label">
        <v-icon>mdi-sprout</v-icon>
        {{ allTorrents.length }} [{{ totalSize | formatSize }}]
      </v-flex>
      <v-divider vertical class="mx-2" v-if="!phoneLayout"/>
      <v-flex class="icon-label">
        <v-icon>mdi-nas</v-icon>
        {{ info.free_space_on_disk | formatSize }}
      </v-flex>
    </v-layout>
  </v-flex>
  <v-flex shrink v-if="info">
    <v-layout
      :column="phoneLayout"
      :align-center="!phoneLayout"
    >
      <v-flex v-if="!phoneLayout" class="icon-label">
        <v-icon>mdi-access-point-network</v-icon>
        {{ info.dht_nodes }} 节点
      </v-flex>
      <v-divider vertical class="mx-2" v-if="!phoneLayout"/>
      <v-flex class="icon-label">
        <v-tooltip top lazy>
          <template v-slot:activator="{ on }">
            <v-icon
              v-on="on"
              :color="info.connection_status | connectionIconColor"
            >mdi-{{ info.connection_status | connectionIcon }}</v-icon>
            <span v-if="phoneLayout">
              网络状态 {{ info.connection_status }}
            </span>
          </template>
          <span>
            网络状态 {{ info.connection_status }}
          </span>
        </v-tooltip>
      </v-flex>
      <v-divider vertical class="mx-2" v-if="!phoneLayout"/>
      <v-flex class="icon-label">
        <v-switch
          v-if="phoneLayout"
          hide-details
          :value="speedLimited"
          @change="toggleSpeedLimitsMode"
          label="激活限速模式"
          class="mt-0 pt-0 speed-switch"
        >
          <template v-slot:prepend>
            <v-icon
              v-bind="speedModeBind"
            >mdi-speedometer</v-icon>
          </template>
        </v-switch>
        <v-tooltip top lazy v-else>
          <template v-slot:activator="{ on }">
            <v-icon
              v-on="on"
              v-bind="speedModeBind"
              @click="toggleSpeedLimitsMode"
            >mdi-speedometer</v-icon>
          </template>
          <span>
            限速模式：{{ speedLimited ? '开启' : '关闭' }}
          </span>
        </v-tooltip>
      </v-flex>
      <v-divider vertical class="mx-2" v-if="!phoneLayout"/>
      <v-flex class="icon-label">
        <v-icon
          :color=" info.dl_info_speed > 0 ? 'success' : null"
        >mdi-download</v-icon>
        <span>
          {{ info.dl_info_speed | formatSize }}/s
          <template v-if="info.dl_rate_limit">
            ({{ info.dl_rate_limit | formatSize}}/s)
          </template>
          <template>
            [{{ info.dl_info_data | formatSize }}/{{ info.alltime_dl | formatSize }}]
          </template>
        </span>
      </v-flex>
      <v-divider vertical class="mx-2" v-if="!phoneLayout"/>
      <v-flex class="icon-label">
        <v-icon
          :color=" info.up_info_speed > 0 ? 'warning' : null"
        >mdi-upload</v-icon>
        <span>
          {{ info.up_info_speed | formatSize }}/s
          <template v-if="info.up_rate_limit">
            ({{ info.up_rate_limit | formatSize}}/s)
          </template>
          <template>
            [{{ info.up_info_data | formatSize }}/{{ info.alltime_ul | formatSize }}]
          </template>
        </span>
      </v-flex>
    </v-layout>
  </v-flex>
</v-layout>
</template>

<script lang="ts">
import Vue from 'vue';
import { api } from '../Api';
import { mapState, mapGetters } from 'vuex';
import _ from 'lodash'; 

export default Vue.extend({
  props: {
    phoneLayout: Boolean,
  },

  data() {
    return {
      app: null,
      speedLimited: false,
    };
  },

  filters: {
    connectionIcon(status: string) {
      const statusMap: any = {
        connected: 'server-network',
        firewalled: 'server-network-off',
        disconnected: 'security-network',
      };
      return statusMap[status];
    },
    connectionIconColor(status: string) {
      const statusMap: any = {
        connected: 'success',
        firewalled: 'warning',
        disconnected: 'error',
      };
      return statusMap[status];
    },
  },

  computed: {
    ...mapState({
      info(state: any) {
        return this.isDataReady ? state.mainData.server_state : null;
      },
    }),
    ...mapGetters([
      'isDataReady',
      'allTorrents'
    ]),
    totalSize() {
      return _.sumBy(this.allTorrents, 'size');
    },
    speedModeBind() {
      if (this.speedLimited) {
        return {
          class: 'speed-limited',
          color: 'warning',
        }
      }

      return {
        class: null,
        color: 'success'
      }
    },
    topLayoutBind() {
      const v: boolean = this.phoneLayout;
      return {
        column: v,
        class: v ? 'in-drawer' : null,
        'mx-4': !v,
        'fill-height': !v,
        'align-center': !v,
        'justify-space-between': !v,
      };
    },
  },

  methods: {
    async getAppInfo() {
      let resp = await api.getAppVersion();
      const version = resp.data;

      resp = await api.getApiVersion();
      const apiVersion = resp.data;

      this.app = {
        version, apiVersion,
      };
    },
    async toggleSpeedLimitsMode() {
      this.speedLimited = !this.speedLimited;
      await api.toggleSpeedLimitsMode();
    },
  },

  async created() {
    if (!this.isDataReady) {
      return;
    }
    this.speedLimited = this.info.use_alt_speed_limits;
    await this.getAppInfo();
  },

  watch: {
    async isDataReady(v) {
      if (v && this.app === null) {
        await this.getAppInfo();
      }
    },
    'info.use_alt_speed_limits'(v) {
      this.speedLimited = v;
    },
  },
});
</script>

<style lang="scss" scoped>
.icon-label {
  display: flex;
  align-items: center;
}
.speed-switch {
  font-size: inherit;

  ::v-deep {
    .v-input__prepend-outer {
      margin-right: 0;
    }

    .v-input__control {
      margin-left: 4px;
      width: 100%;

      .v-input__slot {
        justify-content: space-between;

        .v-input--selection-controls__input {
          order: 2;
        }

        .v-label {
          color: inherit;
          font-size: inherit;
        }
      }
    }
  }
}

.speed-limited {
  transform: scaleX(-1);
}
.in-drawer {
  padding: 0 5px;
  font-size: 12px;

  .no-icon {
    margin-left: 24px;
  }
}
</style>
