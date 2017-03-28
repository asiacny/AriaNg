(function () {
    'use strict';

    angular.module('ariaNg').controller('NewTaskController', ['$rootScope', '$scope', '$location', '$timeout', 'ariaNgCommonService', 'ariaNgFileService', 'aria2SettingService', 'aria2TaskService', function ($rootScope, $scope, $location, $timeout, ariaNgCommonService, ariaNgFileService, aria2SettingService, aria2TaskService) {
        var tabOrders = ['links', 'options'];

        var downloadByLinks = function (pauseOnAdded, responseCallback) {
            var urls = $scope.context.urls.split('\n');
            var options = angular.copy($scope.context.options);
            var tasks = [];

            for (var i = 0; i < urls.length; i++) {
                if (urls[i] === '' || urls[i].trim() === '') {
                    continue;
                }

                tasks.push({
                    urls: [urls[i].trim()],
                    options: options
                });
            }

            return aria2TaskService.newUriTasks(tasks, pauseOnAdded, responseCallback);
        };

        var downloadByTorrent = function (pauseOnAdded, responseCallback) {
            var task = {
                content: $scope.context.uploadFile.base64Content,
                options: angular.copy($scope.context.options)
            };

            return aria2TaskService.newTorrentTask(task, pauseOnAdded, responseCallback);
        };

        var downloadByMetalink = function (pauseOnAdded, responseCallback) {
            var task = {
                content: $scope.context.uploadFile.base64Content,
                options: angular.copy($scope.context.options)
            };

            return aria2TaskService.newMetalinkTask(task, pauseOnAdded, responseCallback);
        };

        $scope.context = {
            currentTab: 'links',
            taskType: 'urls',
            urls: '',
            uploadFile: null,
            availableOptions: (function () {
                var keys = aria2SettingService.getNewTaskOptionKeys();

                return aria2SettingService.getSpecifiedOptions(keys, {
                    disableRequired: true
                });
            })(),
            globalOptions: null,
            options: {},
            optionFilter: {
                global: true,
                http: false,
                bittorrent: false
            }
        };

        $scope.changeTab = function (tabName) {
            if (tabName === 'options') {
                $scope.loadDefaultOption();
            }

            $scope.context.currentTab = tabName;
        };

        $rootScope.swipeActions.extentLeftSwipe = function () {
            var tabIndex = tabOrders.indexOf($scope.context.currentTab);

            if (tabIndex < tabOrders.length - 1) {
                $scope.changeTab(tabOrders[tabIndex + 1]);
                return true;
            } else {
                return false;
            }
        };

        $rootScope.swipeActions.extentRightSwipe = function () {
            var tabIndex = tabOrders.indexOf($scope.context.currentTab);

            if (tabIndex > 0) {
                $scope.changeTab(tabOrders[tabIndex - 1]);
                return true;
            } else {
                return false;
            }
        };

        $scope.loadDefaultOption = function () {
            if ($scope.context.globalOptions) {
                return;
            }

            $rootScope.loadPromise = aria2SettingService.getGlobalOption(function (response) {
                if (response.success) {
                    $scope.context.globalOptions = response.data;
                }
            });
        };

        $scope.openTorrent = function () {
            ariaNgFileService.openFileContent('.torrent', function (result) {
                $scope.context.uploadFile = result;
                $scope.context.taskType = 'torrent';
                $scope.changeTab('options');
            }, function (error) {
                ariaNgCommonService.showError(error);
            });
        };

        $scope.openMetalink = function () {
            ariaNgFileService.openFileContent('.meta4,.metalink', function (result) {
                $scope.context.uploadFile = result;
                $scope.context.taskType = 'metalink';
                $scope.changeTab('options');
            }, function (error) {
                ariaNgCommonService.showError(error);
            });
        };

        $scope.startDownload = function (pauseOnAdded) {
            var responseCallback = function (response) {
                if (!response.hasSuccess && !response.success) {
                    return;
                }

                if (pauseOnAdded) {
                    $location.path('/waiting');
                } else {
                    $location.path('/downloading');
                }
            };

            if ($scope.context.taskType === 'urls') {
                $rootScope.loadPromise = downloadByLinks(pauseOnAdded, responseCallback);
            } else if ($scope.context.taskType === 'torrent') {
                $rootScope.loadPromise = downloadByTorrent(pauseOnAdded, responseCallback);
            } else if ($scope.context.taskType === 'metalink') {
                $rootScope.loadPromise = downloadByMetalink(pauseOnAdded, responseCallback);
            }
        };

        $scope.setOption = function (key, value, optionStatus) {
            if (value !== '') {
                $scope.context.options[key] = value;
            } else {
                delete $scope.context.options[key];
            }

            optionStatus.setReady();
        };

        $scope.urlTextboxKeyDown = function (event) {
            if (event.keyCode === 13 && event.ctrlKey && $scope.newTaskForm.$valid) {
                $scope.startDownload();
            }
        };

        $rootScope.loadPromise = $timeout(function () {}, 100);
    }]);
}());
