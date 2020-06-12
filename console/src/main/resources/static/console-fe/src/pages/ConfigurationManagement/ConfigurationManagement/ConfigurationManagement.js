/*
 * Copyright 1999-2018 Alibaba Group Holding Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Checkbox,
  Collapse,
  ConfigProvider,
  Dialog,
  Dropdown,
  Field,
  Form,
  Icon,
  Input,
  Loading,
  Menu,
  Pagination,
  Select,
  Table,
  Grid,
  Upload,
  Message,
} from '@alifd/next';
import BatchHandle from 'components/BatchHandle';
import RegionGroup from 'components/RegionGroup';
import ShowCodeing from 'components/ShowCodeing';
import DeleteDialog from 'components/DeleteDialog';
import DashboardCard from './DashboardCard';
import { getParams, setParams, request, aliwareIntl } from '@/globalLib';
import { connect } from 'react-redux';
import { getConfigs } from '../../../reducers/configuration';

import './index.scss';
import { LANGUAGE_KEY } from '../../../constants';

const { Panel } = Collapse;
const configsTableSelected = new Map();
@connect(
  state => ({
    configurations: state.configuration.configurations,
  }),
  { getConfigs }
)
@ConfigProvider.config
class ConfigurationManagement extends React.Component {
  static displayName = 'ConfigurationManagement';

  static propTypes = {
    locale: PropTypes.object,
    history: PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.deleteDialog = React.createRef();
    this.showcode = React.createRef();
    this.field = new Field(this);
    this.appName = getParams('appName') || getParams('edasAppId') || '';
    this.preAppName = this.appName;
    this.group = getParams('group') || '';
    this.preGroup = this.group;
    this.dataId = getParams('dataId') || '';
    this.preDataId = this.dataId;
    this.serverId = getParams('serverId') || 'center';
    this.edasAppId = getParams('edasAppId') || '';
    this.edasAppName = getParams('edasAppName') || '';
    this.inApp = this.edasAppId;
    this.state = {
      value: '',
      visible: false,
      total: 0,
      pageSize: 10,
      currentPage: 1,
      dataSource: [],
      fieldValue: [],
      showAppName: false,
      showgroup: false,
      dataId: this.dataId,
      group: this.group,
      appName: this.appName,
      config_tags: [],
      tagLst: [],
      selectValue: [],
      loading: false,
      groupList: [],
      groups: [],
      tenant: true,
      nownamespace_id: window.nownamespace || '',
      nownamespace_name: window.namespaceShowName || '',
      selectedRecord: [],
      selectedKeys: [],
      hasdash: false,
      isCn: true,
      contentList: [],
      isAdvancedQuery: false,
      isCheckAll: false,
      rowSelection: {
        onChange: this.configDataTableOnChange.bind(this),
        selectedRowKeys: [],
      },
      isPageEnter: false,
    };
    const obj = {
      dataId: this.dataId || '',
      group: this.preGroup || '',
      appName: this.appName || '',
    };
    setParams(obj);
    this.batchHandle = null;
    this.toggleShowQuestionnaire = this.toggleShowQuestionnaire.bind(this);
  }

  componentDidMount() {
    const { locale = {} } = this.props;
    // this.getGroup();
    this.setIsCn();
    if (window._getLink && window._getLink('isCn') === 'true') {
      if (!this.checkQuestionnaire()) {
        if (window.location.host === 'acm.console.aliyun.com') {
          Dialog.alert({
            title: locale.questionnaire2,
            style: {
              width: '60%',
            },
            content: (
              <div>
                <div style={{ fontSize: '15px', lineHeight: '22px' }}>
                  {locale.ad}
                  {/* eslint-disable */}
                  <a href="https://survey.aliyun.com/survey/k0BjJ2ARC" target="_blank">
                    {locale.questionnaire2}
                  </a>
                </div>
                <div style={{ fontSize: '15px' }}>
                  {locale.noLongerDisplay4}
                  <Checkbox onChange={this.toggleShowQuestionnaire} />
                </div>
              </div>
            ),
          });
        }
      }
    }
  }

  setIsCn() {
    this.setState({ isCn: localStorage.getItem(LANGUAGE_KEY) === 'zh-CN' });
  }

  /**
   * 获取概览页数据
   */
  getContentList() {
    request({
      url: 'com.alibaba.nacos.service.dashlist', // 以 com.alibaba. 开头最终会转换为真正的url地址
      data: {},
      $data: {}, // 替换请求url路径中{}占位符的内容
      success: res => {
        if (res.code === 200 && res.data) {
          if (res.data.length === 0) {
            this.setState({
              hasdash: false,
            });
          } else {
            this.setState({
              hasdash: true,
              contentList: res.data,
            });
          }
        }
      },
    });
  }

  toggleShowQuestionnaire(value) {
    if (value) {
      localStorage.setItem('acm_questionnaire', 1);
    } else {
      localStorage.removeItem('acm_questionnaire');
    }
  }

  checkQuestionnaire() {
    const acm_questionnaire = localStorage.getItem('acm_questionnaire');
    if (acm_questionnaire) {
      return true;
    } else {
      return false;
    }
  }

  navTo(url, record) {
    this.serverId = getParams('serverId') || '';
    this.tenant = getParams('namespace') || ''; // 为当前实例保存tenant参数
    this.props.history.push(
      `${url}?serverId=${this.serverId || ''}&dataId=${record.dataId}&group=${
        record.group
      }&namespace=${this.tenant}`
    );
  }

  openLoading() {
    this.setState({
      loading: true,
    });
  }

  closeLoading() {
    this.setState({
      loading: false,
    });
  }

  cleanAndGetData(needclean = false) {
    if (needclean) {
      this.dataId = '';
      this.group = '';
      this.setState({
        group: '',
        dataId: '',
      });
      setParams({
        group: '',
        dataId: '',
      });
    }
    this.getData();
    configsTableSelected.clear();
    const { rowSelection } = this.state;
    rowSelection.selectedRowKeys = [];
    this.setState({ rowSelection });
  }

  getData(pageNo = 1, clearSelect = true) {
    if (this.state.loading) {
      return;
    }
    this.tenant = getParams('namespace') || ''; // 为当前实例保存tenant参数
    this.serverId = getParams('serverId') || '';
    const params = {
      dataId: this.dataId,
      group: this.group,
      appName: this.appName,
      config_tags: this.state.config_tags.join(','),
      pageNo,
      pageSize: this.state.pageSize,
      tenant: this.tenant,
    };
    if (this.dataId.indexOf('*') !== -1 || this.group.indexOf('*') !== -1) {
      params.search = 'blur';
    } else {
      params.search = 'accurate';
    }
    this.setState({ loading: true });
    this.props.getConfigs(params).then(() =>
      this.setState({
        loading: false,
        selectedRecord: [],
        selectedKeys: [],
        tenant: this.tenant,
      })
    );
  }

  showMore() {}

  chooseNav(record, key) {
    const self = this;
    switch (key) {
      case 'nav1':
        self.navTo('/historyRollback', record);
        break;
      case 'nav2':
        self.navTo('/pushTrajectory', record);
        break;
      default:
      case 'nav3':
        self.navTo('/listeningToQuery', record);
        break;
    }
  }

  removeConfig(record) {
    const { locale = {} } = this.props;
    const self = this;
    Dialog.confirm({
      title: locale.removeConfiguration,
      content: (
        <div style={{ marginTop: '-20px' }}>
          <h3>{locale.sureDelete}</h3>
          <p>
            <span style={{ color: '#999', marginRight: 5 }}>Data ID:</span>
            <span style={{ color: '#c7254e' }}>{record.dataId}</span>
          </p>
          <p>
            <span style={{ color: '#999', marginRight: 5 }}>Group:</span>
            <span style={{ color: '#c7254e' }}>{record.group}</span>
          </p>
          <p>
            <span style={{ color: '#999', marginRight: 5 }}>{locale.environment}</span>
            <span style={{ color: '#c7254e' }}>{self.serverId || ''}</span>
          </p>
        </div>
      ),
      onOk: () => {
        const url = `v1/cs/configs?dataId=${record.dataId}&group=${record.group}`;
        request({
          url,
          type: 'delete',
          success(res) {
            const _payload = {};

            _payload.title = locale.configurationManagement;
            _payload.content = '';
            _payload.dataId = record.dataId;
            _payload.group = record.group;
            if (res === true) {
              _payload.isok = true;
            } else {
              _payload.isok = false;
              _payload.message = res.message;
            }
            self.deleteDialog.current.getInstance().openDialog(_payload);
            self.getData();
          },
        });
      },
    });
  }

  renderLastTime(value, index, record) {
    return <div>{aliwareIntl.intlNumberFormat(record.lastModifiedTime)}</div>;
  }

  showCode(record) {
    this.showcode.current.getInstance().openDialog(record);
  }

  renderCol(value, index, record) {
    const { locale = {} } = this.props;
    return (
      <div>
        <a onClick={this.goDetail.bind(this, record)} style={{ marginRight: 5 }}>
          {locale.details}
        </a>
        <span style={{ marginRight: 5 }}>|</span>
        <a style={{ marginRight: 5 }} onClick={this.showCode.bind(this, record)}>
          {locale.sampleCode}
        </a>
        <span style={{ marginRight: 5 }}>|</span>
        <a style={{ marginRight: 5 }} onClick={this.goEditor.bind(this, record)}>
          {locale.edit}
        </a>
        <span style={{ marginRight: 5 }}>|</span>
        <a style={{ marginRight: 5 }} onClick={this.removeConfig.bind(this, record)}>
          {locale.deleteAction}
        </a>
        <span style={{ marginRight: 5 }}>|</span>

        <Dropdown
          trigger={
            <span style={{ color: '#33cde5' }}>
              {locale.more}
              <Icon type={'arrow-down-filling'} size={'xxs'} />
            </span>
          }
          triggerType={'click'}
        >
          <Menu onItemClick={this.chooseNav.bind(this, record)}>
            <Menu.Item key={'nav1'}>{locale.version}</Menu.Item>
            <Menu.Item key={'nav3'}>{locale.listenerQuery}</Menu.Item>
          </Menu>
        </Dropdown>
      </div>
    );
  }

  changePage(value, e) {
    this.setState(
      {
        isPageEnter: e && e.keyCode && e.keyCode === 13,
        currentPage: value,
      },
      () => this.getData(value, false)
    );
  }

  handlePageSizeChange(pageSize) {
    this.setState({ pageSize }, () => this.changePage(1));
  }

  chooseFieldChange(fieldValue) {
    this.setState({
      fieldValue,
    });
  }

  showSelect(value) {
    this.setState({
      selectValue: value,
    });
    if (value.indexOf('appName') !== -1) {
      this.setState({
        showAppName: true,
      });
    } else {
      this.setState({
        showAppName: false,
      });
    }
    if (value.indexOf('group') !== -1) {
      this.setState({
        showgroup: true,
      });
    } else {
      this.setState({
        showgroup: false,
      });
    }
    this.chooseFieldChange(value);
  }

  getAppName(value) {
    this.appName = value;
    this.setState({
      appName: value,
    });
  }

  setAppName(value) {
    this.appName = value;
    this.setState({
      appName: value,
    });
  }

  setConfigTags(value) {
    this.setState({
      config_tags: value || [],
      tagLst: value,
    });
  }

  /**
   * groupId赋值
   */
  setGroup(value) {
    this.group = value || '';
    this.setState({
      group: value || '',
    });
  }

  selectAll() {
    setParams('dataId', this.dataId);
    setParams('group', this.group);
    setParams('appName', this.appName);
    this.getData();
  }

  resetAll() {
    this.dataId = '';
    this.appName = '';
    this.group = '';
    this.setState({
      selectValue: [],
      dataId: '',
      appName: '',
      group: '',
      showAppName: false,
      showgroup: false,
    });
    this.selectAll();
  }

  chooseEnv(value) {
    this.serverId = getParams('serverId') || 'center';
    this.tenant = getParams('namespace') || ''; // 为当前实例保存tenant参数
    this.props.history.push(
      `/newconfig?serverId=${this.serverId || ''}&namespace=${this.tenant}&edasAppName=${
        this.edasAppName
      }&edasAppId=${this.edasAppId}&searchDataId=${this.dataId}&searchGroup=${this.group}`
    );
  }

  setNowNameSpace(name, id) {
    this.setState({
      nownamespace_name: name,
      nownamespace_id: id,
    });
  }

  goDetail(record) {
    this.serverId = getParams('serverId') || 'center';
    this.tenant = getParams('namespace') || ''; // 为当前实例保存tenant参数
    // 点击详情到另一个页面, 返回时候要保留原来的搜索条件 比如: record.dataId为详情的, this.dataId为搜索条件的.
    this.props.history.push(
      `/configdetail?serverId=${this.serverId || ''}&dataId=${record.dataId}&group=${
        record.group
      }&namespace=${this.tenant}&edasAppName=${this.edasAppName}&searchDataId=${
        this.dataId
      }&searchGroup=${this.group}`
    );
  }

  goEditor(record) {
    this.serverId = getParams('serverId') || 'center';
    this.tenant = getParams('namespace') || ''; // 为当前实例保存tenant参数
    this.props.history.push(
      `/configeditor?serverId=${this.serverId || ''}&dataId=${record.dataId}&group=${
        record.group
      }&namespace=${this.tenant}&edasAppName=${this.edasAppName}&edasAppId=${
        this.edasAppId
      }&searchDataId=${this.dataId}&searchGroup=${this.group}`
    );
  }

  goConfigSync(record) {
    this.serverId = getParams('serverId') || 'center';
    this.tenant = getParams('namespace') || ''; // 为当前实例保存tenant参数
    this.props.history.push(
      `/configsync?serverId=${this.serverId || ''}&dataId=${record.dataId}&group=${
        record.group
      }&namespace=${this.tenant}`
    );
  }

  onSelectChange(...args) {
    const record = [];
    args[1].forEach(item => {
      if (args[0].indexOf(item.id) >= 0 && this.state.selectedKeys.indexOf(item.id) < 0) {
        record.push(item);
      }
    });
    this.state.selectedRecord.forEach(item => {
      if (args[0].indexOf(item.id) >= 0) {
        record.push(item);
      }
    });
    this.setState({
      selectedRecord: record,
      selectedKeys: args[0],
      isCheckAll: record.length > 0 && record.length === this.state.dataSource.length,
    });
  }

  getBatchFailedContent(res) {
    const { locale = {} } = this.props;
    return (
      <div>
        <div style={{ fontSize: 18, color: '#373D41', overflow: 'auto' }}>{res.message}</div>
        {'data' in res && res.data != null && (
          <Collapse style={{ width: '500px' }}>
            {'failedItems' in res.data && res.data.failedItems.length > 0 ? (
              <Panel title={locale.failedEntry + res.data.failedItems.length}>
                <Table dataSource={res.data.failedItems} fixedHeader>
                  <Table.Column title={'Data ID'} dataIndex={'dataId'} />
                  <Table.Column title={'Group'} dataIndex={'group'} />
                </Table>
              </Panel>
            ) : (
              <Panel style={{ display: 'none' }} />
            )}
            {'succeededItems' in res.data && res.data.succeededItems.length > 0 ? (
              <Panel title={locale.successfulEntry + res.data.succeededItems.length}>
                <Table dataSource={res.data.succeededItems} fixedHeader>
                  <Table.Column title={'Data ID'} dataIndex={'dataId'} />
                  <Table.Column title={'Group'} dataIndex={'group'} />
                </Table>
              </Panel>
            ) : (
              <Panel style={{ display: 'none' }} />
            )}
            {'unprocessedItems' in res.data && res.data.unprocessedItems.length > 0 ? (
              <Panel title={locale.unprocessedEntry + res.data.unprocessedItems.length}>
                <Table dataSource={res.data.unprocessedItems} fixedHeader>
                  <Table.Column title={'Data ID'} dataIndex={'dataId'} />
                  <Table.Column title={'Group'} dataIndex={'group'} />
                </Table>
              </Panel>
            ) : (
              <Panel style={{ display: 'none' }} />
            )}
          </Collapse>
        )}
      </div>
    );
  }

  onClickBatchHandle() {
    this.batchHandle &&
      this.batchHandle.openDialog({
        serverId: this.serverId,
        group: this.group,
        dataId: this.dataId,
        appName: this.appName,
        config_tags: this.state.config_tags || '',
        pageSize: this.state.pageSize,
      });
  }

  changeAdvancedQuery = () => {
    this.setState({
      isAdvancedQuery: !this.state.isAdvancedQuery,
    });
  };

  checkAllHandle(checked) {
    this.setState({
      isCheckAll: checked,
      selectedKeys: checked ? this.state.dataSource.map(item => item.id) : [],
      selectedRecord: checked ? this.state.dataSource : [],
    });
  }

  openUri(url, params) {
    window.open(
      [
        url,
        Object.keys(params)
          .map(key => `${key}=${params[key]}`)
          .join('&'),
      ].join('?')
    );
  }

  exportData() {
    const { group, appName, dataId, openUri } = this;
    const { accessToken = '' } = JSON.parse(localStorage.token || '{}');
    openUri('v1/cs/configs', {
      export: 'true',
      tenant: getParams('namespace'),
      group,
      appName,
      dataId,
      ids: '',
      accessToken,
    });
  }

  exportSelectedData() {
    const ids = [];
    const { locale = {} } = this.props;
    const { accessToken = '' } = JSON.parse(localStorage.token || '{}');
    if (!configsTableSelected.size) {
      Dialog.alert({
        title: locale.exportSelectedAlertTitle,
        content: locale.exportSelectedAlertContent,
      });
      return;
    }
    configsTableSelected.forEach((value, key, map) => ids.push(key));
    this.openUri('v1/cs/configs', {
      export: 'true',
      tenant: '',
      group: '',
      appName: '',
      ids: ids.join(','),
      accessToken,
    });
  }

  multipleSelectionDeletion() {
    const { locale = {} } = this.props;
    const self = this;
    if (configsTableSelected.size === 0) {
      Dialog.alert({
        title: locale.delSelectedAlertTitle,
        content: locale.delSelectedAlertContent,
      });
    } else {
      let toShowDatas = [];
      configsTableSelected.forEach((value, key, map) => {
        let item = {};
        item.dataId = value.dataId;
        item.group = value.group;
        toShowDatas.push(item);
      });
      Dialog.confirm({
        title: locale.removeConfiguration,
        content: (
          <div style={{ marginTop: '-20px' }}>
            <h3>{locale.sureDelete}</h3>
            <Table dataSource={toShowDatas}>
              <Table.Column title="Data Id" dataIndex="dataId" />
              <Table.Column title="Group" dataIndex="group" />
            </Table>
          </div>
        ),
        onOk: () => {
          const url = `v1/cs/configs?delType=ids&ids=${Array.from(configsTableSelected.keys()).join(
            ','
          )}`;
          request({
            url,
            type: 'delete',
            success(res) {
              Message.success(locale.delSuccessMsg);
              self.getData();
            },
          });
        },
      });
    }
  }

  cloneSelectedDataConfirm() {
    const { locale = {} } = this.props;
    const self = this;
    self.field.setValue('sameConfigPolicy', 'ABORT');
    self.field.setValue('cloneTargetSpace', undefined);
    if (configsTableSelected.size === 0) {
      Dialog.alert({
        title: locale.cloneSelectedAlertTitle,
        content: locale.cloneSelectedAlertContent,
      });
      return;
    }
    request({
      url: 'v1/console/namespaces?namespaceId=',
      beforeSend() {
        self.openLoading();
      },
      success(data) {
        self.closeLoading();
        if (!data || data.code !== 200 || !data.data) {
          Dialog.alert({
            title: locale.getNamespaceFailed,
            content: locale.getNamespaceFailed,
          });
        }
        let namespaces = data.data;
        let namespaceSelectData = [];
        let namespaceSelecItemRender = item => {
          if (item.isCurrent) {
            return <span style={{ color: '#00AA00', 'font-weight': 'bold' }}>{item.label}</span>;
          } else {
            return <span>{item.label}</span>;
          }
        };
        namespaces.forEach(item => {
          let dataItem = {};
          dataItem.isCurrent = false;
          if (self.state.nownamespace_id === item.namespace) {
            dataItem.isCurrent = true;
          }
          if (item.namespaceShowName === 'public') {
            dataItem.label = 'public | public';
            dataItem.value = 'public';
          } else {
            dataItem.label = `${item.namespaceShowName} | ${item.namespace}`;
            dataItem.value = item.namespace;
          }
          namespaceSelectData.push(dataItem);
        });

        let editableTableData = [];
        let configsTableSelectedDeepCopyed = new Map();
        configsTableSelected.forEach((value, key, map) => {
          let dataItem = {};
          dataItem.id = key;
          dataItem.dataId = value.dataId;
          dataItem.group = value.group;
          editableTableData.push(dataItem);
          configsTableSelectedDeepCopyed.set(key, JSON.parse(JSON.stringify(value)));
        });
        let editableTableOnBlur = (record, type, e) => {
          if (type === 1) {
            configsTableSelectedDeepCopyed.get(record.id).dataId = e.target.value;
          } else {
            configsTableSelectedDeepCopyed.get(record.id).group = e.target.value;
          }
        };

        let renderEditableTableCellDataId = (value, index, record) => (
          <Input defaultValue={value} onBlur={editableTableOnBlur.bind(this, record, 1)} />
        );
        let renderEditableTableCellGroup = (value, index, record) => (
          <Input defaultValue={value} onBlur={editableTableOnBlur.bind(this, record, 2)} />
        );

        const cloneConfirm = Dialog.confirm({
          title: locale.cloningConfiguration,
          footer: false,
          content: (
            <>
              <div style={{ marginBottom: 10 }}>
                <span style={{ color: '#999', marginRight: 5 }}>{locale.source}</span>
                <span style={{ color: '#49D2E7' }}>{self.state.nownamespace_name} </span>|{' '}
                {self.state.nownamespace_id}
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={{ color: '#999', marginRight: 5 }}>{locale.configurationNumber}</span>
                <span style={{ color: '#49D2E7' }}>{configsTableSelected.size} </span>
                {locale.selectedEntry}
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={{ color: 'red', marginRight: 2, marginLeft: -10 }}>{'*'}</span>
                <span style={{ color: '#999', marginRight: 5 }}>{locale.target}</span>
                <Select
                  style={{ width: 450 }}
                  placeholder={locale.selectNamespace}
                  size={'medium'}
                  hasArrow
                  showSearch
                  hasClear={false}
                  mode="single"
                  itemRender={namespaceSelecItemRender}
                  dataSource={namespaceSelectData}
                  onChange={(value, actionType, item) => {
                    if (value) {
                      document.getElementById('cloneTargetSpaceSelectErr').style.display = 'none';
                      self.field.setValue('cloneTargetSpace', value);
                    }
                  }}
                />
                <br />
                <span id={'cloneTargetSpaceSelectErr'} style={{ color: 'red', display: 'none' }}>
                  {locale.selectNamespace}
                </span>
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={{ color: '#999', marginRight: 5 }}>{locale.samePreparation}:</span>
                <Select
                  style={{ width: 130 }}
                  size={'medium'}
                  hasArrow
                  mode="single"
                  filterLocal={false}
                  defaultValue={'ABORT'}
                  dataSource={[
                    {
                      label: locale.abortImport,
                      value: 'ABORT',
                    },
                    {
                      label: locale.skipImport,
                      value: 'SKIP',
                    },
                    {
                      label: locale.overwriteImport,
                      value: 'OVERWRITE',
                    },
                  ]}
                  hasClear={false}
                  onChange={(value, actionType, item) => {
                    if (value) {
                      self.field.setValue('sameConfigPolicy', value);
                    }
                  }}
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <Button
                  type={'primary'}
                  style={{ marginRight: 10 }}
                  onClick={() => {
                    if (!self.field.getValue('cloneTargetSpace')) {
                      document.getElementById('cloneTargetSpaceSelectErr').style.display = 'inline';
                      return;
                    } else {
                      document.getElementById('cloneTargetSpaceSelectErr').style.display = 'none';
                    }
                    let idsStr = '';
                    let clonePostData = [];
                    configsTableSelectedDeepCopyed.forEach((value, key, map) => {
                      let postDataItem = {};
                      postDataItem.cfgId = key;
                      postDataItem.dataId = value.dataId;
                      postDataItem.group = value.group;
                      clonePostData.push(postDataItem);
                    });
                    let cloneTargetSpace = self.field.getValue('cloneTargetSpace');
                    let sameConfigPolicy = self.field.getValue('sameConfigPolicy');
                    request({
                      url: `v1/cs/configs?clone=true&tenant=${cloneTargetSpace}&policy=${sameConfigPolicy}&namespaceId=`,
                      method: 'post',
                      data: JSON.stringify(clonePostData),
                      contentType: 'application/json',
                      beforeSend() {
                        self.openLoading();
                      },
                      success(ret) {
                        self.closeLoading();
                        self.processImportAndCloneResult(ret, locale, cloneConfirm, false);
                      },
                      error(data) {
                        self.closeLoading();
                        self.setState({
                          dataSource: [],
                          total: 0,
                          currentPage: 0,
                        });
                      },
                      complete() {
                        self.closeLoading();
                      },
                    });
                  }}
                  data-spm-click={'gostr=/aliyun;locaid=doClone'}
                >
                  {locale.startCloning}
                </Button>
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={{ color: '#00AA00', fontWeight: 'bold' }}>
                  {locale.cloneEditableTitle}
                </span>
              </div>
              <Table dataSource={editableTableData}>
                <Table.Column
                  title="Data Id"
                  dataIndex="dataId"
                  cell={renderEditableTableCellDataId}
                />
                <Table.Column title="Group" dataIndex="group" cell={renderEditableTableCellGroup} />
              </Table>
            </>
          ),
        });
      },
      error(data) {
        self.closeLoading();
        self.setState({
          dataSource: [],
          total: 0,
          currentPage: 0,
        });
      },
      complete() {
        self.closeLoading();
      },
    });
  }

  processImportAndCloneResult(ret, locale, confirm, isImport) {
    const resultCode = ret.code;
    if (resultCode === 200) {
      confirm.hide();
      if (ret.data.failData && ret.data.failData.length > 0) {
        Dialog.alert({
          title: isImport ? locale.importAbort : locale.cloneAbort,
          content: (
            <div style={{ width: '500px' }}>
              <h4>
                {locale.conflictConfig}：{ret.data.failData[0].group}/{ret.data.failData[0].dataId}
              </h4>
              <div style={{ marginTop: 20 }}>
                <h5>
                  {locale.failureEntries}: {ret.data.failData.length}
                </h5>
                <Table dataSource={ret.data.failData}>
                  <Table.Column title="Data Id" dataIndex="dataId" />
                  <Table.Column title="Group" dataIndex="group" />
                </Table>
              </div>
              <div>
                <h5>
                  {locale.unprocessedEntries}: {ret.data.skipData ? ret.data.skipData.length : 0}
                </h5>
                <Table dataSource={ret.data.skipData}>
                  <Table.Column title="Data Id" dataIndex="dataId" />
                  <Table.Column title="Group" dataIndex="group" />
                </Table>
              </div>
            </div>
          ),
        });
      } else if (ret.data.skipCount && ret.data.skipCount > 0) {
        Dialog.alert({
          title: isImport ? locale.importSucc : locale.cloneSucc,
          content: (
            <div style={{ width: '500px' }}>
              <div>
                <h5>
                  {locale.skippedEntries}: {ret.data.skipData.length}
                </h5>
                <Table dataSource={ret.data.skipData}>
                  <Table.Column title="Data Id" dataIndex="dataId" />
                  <Table.Column title="Group" dataIndex="group" />
                </Table>
              </div>
            </div>
          ),
        });
      } else {
        let message = `${isImport ? locale.importSuccBegin : locale.cloneSuccBegin}${
          ret.data.succCount
        }${isImport ? locale.importSuccEnd : locale.cloneSuccEnd}`;
        Message.success(message);
      }
      this.getData();
    } else {
      let alertContent = isImport ? locale.importFailMsg : locale.cloneFailMsg;
      if (resultCode === 100001) {
        alertContent = locale.namespaceNotExist;
      }
      if (resultCode === 100002) {
        alertContent = locale.metadataIllegal;
      }
      if (resultCode === 100003 || resultCode === 100004 || resultCode === 100005) {
        alertContent = locale.importDataValidationError;
      }
      Dialog.alert({
        title: isImport ? locale.importFail : locale.cloneFail,
        content: alertContent,
      });
    }
  }

  importData() {
    const { locale = {} } = this.props;
    const self = this;
    self.field.setValue('sameConfigPolicy', 'ABORT');
    let token = {};
    try {
      token = JSON.parse(localStorage.token);
    } catch (e) {
      console.log(e);
      goLogin();
    }
    const { accessToken = '' } = token;
    const uploadProps = {
      accept: 'application/zip',
      action: `v1/cs/configs?import=true&namespace=${getParams(
        'namespace'
      )}&accessToken=${accessToken}`,
      headers: Object.assign({}, {}, { accessToken }),
      data: {
        policy: self.field.getValue('sameConfigPolicy'),
      },
      beforeUpload(file, options) {
        options.data = {
          policy: self.field.getValue('sameConfigPolicy'),
        };
        return options;
      },
      onSuccess(ret) {
        self.processImportAndCloneResult(ret.response, locale, importConfirm, true);
      },
      onError(err) {
        const { data = {}, status } = err.response;
        if ([401, 403].includes(status)) {
          Dialog.alert({
            title: locale.importFail,
            content: locale.importFail403,
          });
        } else {
          Dialog.alert({
            title: locale.importFail,
            content: locale.importDataValidationError,
          });
        }
      },
    };
    const importConfirm = Dialog.confirm({
      title: locale.import,
      footer: false,
      content: (
        <div>
          <div style={{ marginBottom: 10 }}>
            <span style={{ color: '#999', marginRight: 5 }}>{locale.targetNamespace}:</span>
            <span style={{ color: '#49D2E7' }}>{this.state.nownamespace_name} </span>|{' '}
            {this.state.nownamespace_id}
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={{ color: '#999', marginRight: 5 }}>{locale.samePreparation}:</span>
            <Select
              style={{ width: 130 }}
              size={'medium'}
              hasArrow
              mode="single"
              filterLocal={false}
              defaultValue={'ABORT'}
              dataSource={[
                {
                  label: locale.abortImport,
                  value: 'ABORT',
                },
                {
                  label: locale.skipImport,
                  value: 'SKIP',
                },
                {
                  label: locale.overwriteImport,
                  value: 'OVERWRITE',
                },
              ]}
              hasClear={false}
              onChange={function(value, actionType, item) {
                self.field.setValue('sameConfigPolicy', value);
              }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Icon type="prompt" style={{ color: '#FFA003', marginRight: '10px' }} />
            {locale.importRemind}
          </div>
          <div>
            <Upload
              name={'file'}
              listType="text"
              data-spm-click={'gostr=/aliyun;locaid=configsImport'}
              {...uploadProps}
            >
              <Button type="primary">{locale.uploadBtn}</Button>
            </Upload>
          </div>
        </div>
      ),
    });
  }

  configDataTableOnChange(ids, records) {
    const { rowSelection } = this.state;
    rowSelection.selectedRowKeys = ids;
    this.setState({ rowSelection });
    configsTableSelected.clear();
    records.forEach((record, i) => {
      configsTableSelected.set(record.id, record);
    });
  }

  render() {
    const { locale = {}, configurations = {} } = this.props;
    return (
      <>
        <BatchHandle ref={ref => (this.batchHandle = ref)} />
        <div className={this.state.hasdash ? 'dash-page-container' : ''}>
          <div
            className={this.state.hasdash ? 'dash-left-container' : ''}
            style={{ position: 'relative' }}
          >
            <div style={{ display: this.inApp ? 'none' : 'block', marginTop: -15 }}>
              <RegionGroup
                namespaceCallBack={this.cleanAndGetData.bind(this)}
                setNowNameSpace={this.setNowNameSpace.bind(this)}
              />
            </div>
            <div
              style={{
                display: this.inApp ? 'none' : 'block',
                position: 'relative',
                width: '100%',
                overflow: 'hidden',
                height: '40px',
              }}
            >
              <h3
                style={{
                  height: 30,
                  width: '100%',
                  lineHeight: '30px',
                  padding: 0,
                  margin: 0,
                  paddingLeft: 10,
                  borderLeft: '3px solid #09c',
                  color: '#ccc',
                  fontSize: '12px',
                }}
              >
                <span style={{ fontSize: '14px', color: '#000', marginRight: 8 }}>
                  {locale.configurationManagement8}
                </span>
                <span style={{ fontSize: '14px', color: '#000', marginRight: 8 }}>|</span>
                <span style={{ fontSize: '14px', color: '#000', marginRight: 8 }}>
                  {this.state.nownamespace_name}
                </span>
                <span style={{ fontSize: '14px', color: '#000', marginRight: 18 }}>
                  {this.state.nownamespace_id}
                </span>
                {locale.queryResults}
                <strong style={{ fontWeight: 'bold' }}> {configurations.totalCount} </strong>
                {locale.articleMeetRequirements}
              </h3>
              <div
                style={{ position: 'absolute', textAlign: 'right', zIndex: 2, right: 0, top: 0 }}
              />
            </div>
            <div
              style={{
                position: 'relative',
                marginTop: 10,
                height: this.state.isAdvancedQuery ? 'auto' : 42,
                overflow: 'hidden',
              }}
            >
              <Form inline>
                <Form.Item label="Data ID:">
                  <Input
                    defaultValue={this.dataId}
                    htmlType="text"
                    placeholder={locale.fuzzyd}
                    style={{ width: 200 }}
                    onChange={dataId => {
                      this.dataId = dataId;
                      this.setState({ dataId });
                    }}
                    onPressEnter={() => this.getData()}
                  />
                </Form.Item>

                <Form.Item label="Group:">
                  <Select.AutoComplete
                    style={{ width: 200 }}
                    size={'medium'}
                    placeholder={locale.fuzzyg}
                    dataSource={this.state.groups}
                    value={this.state.group}
                    onChange={this.setGroup.bind(this)}
                    onPressEnter={() => this.getData()}
                    hasClear
                  />
                </Form.Item>
                <Form.Item label={''}>
                  <Button
                    type={'primary'}
                    style={{ marginRight: 10 }}
                    onClick={this.selectAll.bind(this)}
                    data-spm-click={'gostr=/aliyun;locaid=dashsearch'}
                  >
                    {locale.query}
                  </Button>
                </Form.Item>
                <Form.Item
                  style={
                    this.inApp
                      ? { display: 'none' }
                      : { verticalAlign: 'middle', marginTop: 0, marginLeft: 10 }
                  }
                >
                  <div
                    style={{ color: '#33cde5', fontSize: 12, cursor: 'pointer' }}
                    onClick={this.changeAdvancedQuery}
                  >
                    <span style={{ marginRight: 5, lineHeight: '28px' }}>
                      {locale.advancedQuery9}
                    </span>
                    <Icon
                      type={this.state.isAdvancedQuery ? 'arrow-up-filling' : 'arrow-down-filling'}
                      size={'xs'}
                    />
                  </div>
                </Form.Item>
                <Form.Item label={''}>
                  <Button
                    type={'primary'}
                    style={{ marginRight: 10 }}
                    onClick={this.exportData.bind(this)}
                    data-spm-click={'gostr=/aliyun;locaid=configsExport'}
                  >
                    {locale.export}
                  </Button>
                </Form.Item>
                <Form.Item label={''}>
                  <Button
                    type={'primary'}
                    style={{ marginRight: 10 }}
                    onClick={this.importData.bind(this)}
                    data-spm-click={'gostr=/aliyun;locaid=configsExport'}
                  >
                    {locale.import}
                  </Button>
                </Form.Item>
                <br />
                <Form.Item
                  style={this.inApp ? { display: 'none' } : {}}
                  label={locale.application0}
                >
                  <Input
                    htmlType={'text'}
                    placeholder={locale.app1}
                    style={{ width: 200 }}
                    value={this.state.appName}
                    onChange={this.setAppName.bind(this)}
                    onPressEnter={() => this.getData()}
                  />
                </Form.Item>
                <Form.Item label={locale.tags}>
                  <Select
                    style={{ width: 200 }}
                    size="medium"
                    hasArrow
                    mode="tag"
                    placeholder={locale.pleaseEnterTag}
                    dataSource={this.state.tagLst}
                    value={this.state.config_tags}
                    onChange={this.setConfigTags.bind(this)}
                    showSearch
                    onSearch={val => {
                      const { tagLst } = this.state;
                      if (!tagLst.includes(val)) {
                        this.setState({ tagLst: tagLst.concat(val) });
                      }
                    }}
                    hasClear
                  />
                </Form.Item>
              </Form>
              <div style={{ position: 'absolute', right: 10, top: 4 }}>
                <Icon
                  type="add"
                  size="medium"
                  style={{
                    color: 'black',
                    marginRight: 0,
                    verticalAlign: 'middle',
                    cursor: 'pointer',
                    backgroundColor: '#eee',
                    border: '1px solid #ddd',
                    padding: '3px 6px',
                  }}
                  onClick={this.chooseEnv.bind(this)}
                />
              </div>
            </div>
            <Table
              className="configuration-table"
              dataSource={configurations.pageItems}
              locale={{ empty: locale.pubNoData }}
              ref="dataTable"
              loading={this.state.loading}
              rowSelection={this.state.rowSelection}
            >
              <Table.Column title={'Data Id'} dataIndex={'dataId'} />
              <Table.Column title={'Group'} dataIndex={'group'} />
              {!this.inApp && <Table.Column title={locale.application} dataIndex="appName" />}
              <Table.Column title={locale.operation} cell={this.renderCol.bind(this)} />
            </Table>
            {configurations.totalCount > 0 && (
              <>
                <div style={{ float: 'left' }}>
                  {[
                    {
                      warning: true,
                      text: locale.deleteAction,
                      locaid: 'configsDelete',
                      onClick: () => this.multipleSelectionDeletion(),
                    },
                    {
                      text: locale.exportSelected,
                      locaid: 'configsExport',
                      onClick: () => this.exportSelectedData(),
                    },
                    {
                      text: locale.clone,
                      locaid: 'configsDelete',
                      onClick: () => this.cloneSelectedDataConfirm(),
                    },
                  ].map(item => (
                    <Button
                      warning={item.warning}
                      type="primary"
                      style={{ marginRight: 10 }}
                      onClick={item.onClick}
                      data-spm-click={`gostr=/aliyun;locaid=${item.locaid}`}
                    >
                      {item.text}
                    </Button>
                  ))}
                </div>
                <Pagination
                  style={{ float: 'right' }}
                  pageSizeList={[10, 20, 30]}
                  pageSizePosition="start"
                  pageSizeSelector="dropdown"
                  popupProps={{ align: 'bl tl' }}
                  onPageSizeChange={val => this.handlePageSizeChange(val)}
                  current={configurations.pageNumber}
                  total={configurations.totalCount}
                  pageSize={this.state.pageSize}
                  onChange={this.changePage.bind(this)}
                />
              </>
            )}
            <ShowCodeing ref={this.showcode} />
            <DeleteDialog ref={this.deleteDialog} />
          </div>
          {this.state.hasdash && (
            <div className="dash-right-container">
              {this.state.contentList.map((v, i) => (
                <DashboardCard data={v} height={'auto'} key={`show${i}`} />
              ))}
            </div>
          )}
        </div>
      </>
    );
  }
}

export default ConfigurationManagement;
